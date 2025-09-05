import docker
import uuid
import json
import os
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
import structlog
from docker.types import Mount, HostConfig

logger = structlog.get_logger(__name__)

class LabManager:
    """Manages lab environments for challenges"""

    def __init__(self):
        self.docker = docker.from_env()
        self.network_name = os.getenv('LAB_NETWORK', 'cte-labs')
        self._ensure_network()

    def _ensure_network(self):
        """Ensure the lab network exists"""
        try:
            self.docker.networks.get(self.network_name)
        except docker.errors.NotFound:
            self.docker.networks.create(
                self.network_name,
                driver="bridge",
                internal=True,  # No internet access by default
                enable_ipv6=True,
                ipam=docker.types.IPAMConfig(
                    driver='default',
                    pool_configs=[
                        docker.types.IPAMPool(
                            subnet='172.28.0.0/16',
                            gateway='172.28.0.1'
                        ),
                        docker.types.IPAMPool(
                            subnet='fd00::/64',
                            gateway='fd00::1'
                        )
                    ]
                )
            )

    def create_instance(
        self,
        template_id: str,
        challenge_instance_id: str,
        image: str,
        resource_limits: Dict[str, Any],
        network_config: Dict[str, Any],
        startup_script: Optional[str] = None,
        exposed_ports: Optional[List[int]] = None,
        environment: Optional[Dict[str, str]] = None,
        expires_in_minutes: int = 60
    ) -> Dict[str, Any]:
        """Create a new lab instance"""
        
        try:
            # Generate unique name
            container_name = f"lab-{template_id[:8]}-{uuid.uuid4().hex[:8]}"
            
            # Prepare host config
            host_config = self._prepare_host_config(
                resource_limits,
                network_config,
                exposed_ports
            )
            
            # Prepare environment
            env_vars = self._prepare_environment(
                environment,
                challenge_instance_id
            )
            
            # Create container
            container = self.docker.containers.create(
                image=image,
                name=container_name,
                hostname=container_name,
                environment=env_vars,
                ports=exposed_ports,
                host_config=host_config,
                detach=True
            )
            
            # Connect to lab network
            network = self.docker.networks.get(self.network_name)
            network.connect(container)
            
            # Start container
            container.start()
            
            # Run startup script if provided
            if startup_script:
                exec_id = container.exec_run(
                    cmd=["/bin/sh", "-c", startup_script],
                    detach=True
                )
            
            # Get container info
            info = container.attrs
            ip_address = info['NetworkSettings']['Networks'][self.network_name]['IPAddress']
            
            return {
                'container_id': container.id,
                'ip_address': ip_address,
                'status': 'running',
                'started_at': datetime.utcnow().isoformat(),
                'expires_at': (datetime.utcnow() + timedelta(minutes=expires_in_minutes)).isoformat()
            }
            
        except Exception as e:
            logger.error("Failed to create lab instance",
                        error=str(e),
                        template_id=template_id,
                        challenge_instance_id=challenge_instance_id)
            raise

    def _prepare_host_config(
        self,
        resource_limits: Dict[str, Any],
        network_config: Dict[str, Any],
        exposed_ports: Optional[List[int]]
    ) -> HostConfig:
        """Prepare Docker host configuration"""
        
        # Convert ports to Docker format
        port_bindings = {}
        if exposed_ports:
            for port in exposed_ports:
                port_bindings[f"{port}/tcp"] = None  # Let Docker assign random host port
        
        # Prepare resource limits
        mem_limit = resource_limits.get('memory_mb', 512) * 1024 * 1024  # Convert to bytes
        cpu_limit = resource_limits.get('cpu_count', 1)
        
        # Create host config
        host_config = self.docker.api.create_host_config(
            mem_limit=mem_limit,
            nano_cpus=int(cpu_limit * 1e9),  # Convert to nano CPUs
            port_bindings=port_bindings,
            restart_policy={'Name': 'no'},  # Don't restart automatically
            cap_drop=['ALL'],  # Drop all capabilities by default
            security_opt=['no-new-privileges'],
            network_mode=self.network_name
        )
        
        return host_config

    def _prepare_environment(
        self,
        environment: Optional[Dict[str, str]],
        challenge_instance_id: str
    ) -> Dict[str, str]:
        """Prepare environment variables"""
        
        env_vars = {
            'CHALLENGE_INSTANCE_ID': challenge_instance_id,
            'LAB_INITIALIZED_AT': datetime.utcnow().isoformat()
        }
        
        if environment:
            env_vars.update(environment)
            
        return env_vars

    def stop_instance(self, container_id: str):
        """Stop a lab instance"""
        try:
            container = self.docker.containers.get(container_id)
            container.stop(timeout=10)
            container.remove(force=True)
            
        except docker.errors.NotFound:
            logger.warning("Container not found", container_id=container_id)
            
        except Exception as e:
            logger.error("Failed to stop lab instance",
                        error=str(e),
                        container_id=container_id)
            raise

    def get_instance_status(self, container_id: str) -> Dict[str, Any]:
        """Get status of a lab instance"""
        try:
            container = self.docker.containers.get(container_id)
            info = container.attrs
            
            return {
                'status': info['State']['Status'],
                'running': info['State']['Running'],
                'started_at': info['State']['StartedAt'],
                'finished_at': info['State']['FinishedAt'],
                'error': info['State']['Error'],
                'exit_code': info['State']['ExitCode'],
                'resource_usage': {
                    'cpu_percent': None,  # Would need to calculate from stats
                    'memory_usage_bytes': info['State']['Memory'],
                    'network_rx_bytes': None,  # Would need to parse from stats
                    'network_tx_bytes': None
                }
            }
            
        except docker.errors.NotFound:
            return {'status': 'not_found'}
            
        except Exception as e:
            logger.error("Failed to get lab instance status",
                        error=str(e),
                        container_id=container_id)
            raise

    def cleanup_expired(self):
        """Cleanup expired lab instances"""
        try:
            containers = self.docker.containers.list(
                all=True,
                filters={
                    'label': ['managed-by=cte-labs']
                }
            )
            
            for container in containers:
                try:
                    expires_at = container.labels.get('expires-at')
                    if expires_at and datetime.fromisoformat(expires_at) < datetime.utcnow():
                        logger.info("Cleaning up expired container",
                                  container_id=container.id,
                                  name=container.name)
                        container.stop(timeout=10)
                        container.remove(force=True)
                except Exception as e:
                    logger.error("Failed to cleanup container",
                               error=str(e),
                               container_id=container.id)
                    
        except Exception as e:
            logger.error("Failed to cleanup expired instances", error=str(e))
            raise
