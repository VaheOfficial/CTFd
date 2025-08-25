from celery import Celery
import docker
import json
import structlog
from datetime import datetime, timedelta

logger = structlog.get_logger(__name__)

app = Celery('cte-worker')

@app.task(bind=True)
def start_lab_instance(self, lab_template: dict, challenge_instance_id: str):
    """
    Start a lab instance from a template
    
    Args:
        lab_template: LabTemplate model data
        challenge_instance_id: Associated challenge instance ID
    """
    try:
        client = docker.from_env()
        
        # Prepare environment variables
        env = lab_template.get('env_json', {})
        env['CHALLENGE_INSTANCE_ID'] = challenge_instance_id
        
        # Prepare port mappings
        ports = lab_template.get('ports_json', {})
        
        # Container labels for identification and cleanup
        labels = {
            'cte.challenge': lab_template['challenge_id'],
            'cte.instance': challenge_instance_id,
            'cte.template': lab_template['id'],
            'cte.created': datetime.utcnow().isoformat()
        }
        
        # Run container
        if lab_template.get('docker_image'):
            # Single container mode
            container = client.containers.run(
                lab_template['docker_image'],
                detach=True,
                environment=env,
                ports=ports,
                labels=labels,
                networks=['lab-net'],  # Isolated network
                mem_limit='512m',
                cpu_quota=100000,  # 1 CPU
                restart_policy={'Name': 'unless-stopped'}
            )
            
            result = {
                'status': 'RUNNING',
                'container_id': container.id,
                'ports': ports
            }
        
        elif lab_template.get('compose_yaml_s3_key'):
            # Docker Compose mode (TODO: implement when needed)
            raise NotImplementedError("Docker Compose lab templates not yet implemented")
        
        else:
            raise ValueError("Lab template must specify either docker_image or compose_yaml_s3_key")
        
        # Schedule automatic cleanup
        ttl_minutes = lab_template.get('ttl_minutes', 60)
        cleanup_at = datetime.utcnow() + timedelta(minutes=ttl_minutes)
        
        # TODO: Schedule cleanup task
        
        logger.info("Lab instance started",
                   challenge_instance_id=challenge_instance_id,
                   container_id=result['container_id'])
        
        return result
        
    except Exception as e:
        logger.error("Lab instance start failed",
                    error=str(e),
                    challenge_instance_id=challenge_instance_id)
        return {
            'status': 'ERROR',
            'error': str(e)
        }

@app.task(bind=True)
def stop_lab_instance(self, container_id: str):
    """
    Stop and remove a lab instance
    
    Args:
        container_id: Docker container ID to stop
    """
    try:
        client = docker.from_env()
        
        container = client.containers.get(container_id)
        container.stop(timeout=10)
        container.remove()
        
        logger.info("Lab instance stopped", container_id=container_id)
        
        return {'status': 'STOPPED'}
        
    except docker.errors.NotFound:
        logger.warning("Lab instance not found", container_id=container_id)
        return {'status': 'NOT_FOUND'}
        
    except Exception as e:
        logger.error("Lab instance stop failed",
                    error=str(e),
                    container_id=container_id)
        return {
            'status': 'ERROR',
            'error': str(e)
        }

@app.task(bind=True)
def cleanup_expired_labs(self):
    """
    Clean up expired lab instances
    """
    try:
        client = docker.from_env()
        
        # Find containers with CTE labels
        containers = client.containers.list(
            filters={'label': 'cte.instance'},
            all=True
        )
        
        cleaned_count = 0
        for container in containers:
            try:
                created_str = container.labels.get('cte.created')
                if created_str:
                    created_time = datetime.fromisoformat(created_str.replace('Z', '+00:00'))
                    # Default TTL of 2 hours if not specified
                    if datetime.utcnow() - created_time > timedelta(hours=2):
                        container.stop(timeout=10)
                        container.remove()
                        cleaned_count += 1
                        logger.info("Cleaned up expired lab", 
                                   container_id=container.id)
            except Exception as e:
                logger.error("Failed to cleanup lab container",
                            container_id=container.id,
                            error=str(e))
        
        logger.info("Lab cleanup completed", cleaned_count=cleaned_count)
        return {'cleaned_count': cleaned_count}
        
    except Exception as e:
        logger.error("Lab cleanup failed", error=str(e))
        return {'error': str(e)}
