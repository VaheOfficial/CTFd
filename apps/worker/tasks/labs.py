from celery import Celery
import docker
import json
import structlog
import os
from datetime import datetime, timedelta
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from docker_client import get_docker_client

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
        # Check if a lab instance already exists for this challenge instance
        try:
            # Import from mounted API directory
            if '/api_src' not in sys.path:
                sys.path.insert(0, '/api_src')
            from database import SessionLocal
            from models.lab import LabInstance, LabInstanceStatus
            
            db = SessionLocal()
            try:
                existing_lab = db.query(LabInstance).filter(
                    LabInstance.challenge_instance_id == challenge_instance_id,
                    LabInstance.status.in_([LabInstanceStatus.RUNNING, LabInstanceStatus.STARTING])
                ).first()
                
                if existing_lab:
                    logger.info("Lab instance already exists", 
                               challenge_instance_id=challenge_instance_id,
                               existing_lab_id=str(existing_lab.id),
                               status=existing_lab.status.value)
                    return {
                        'status': 'ERROR',
                        'error': 'Lab instance already running or starting for this challenge'
                    }
            finally:
                db.close()
        except Exception as e:
            logger.warning("Could not check for existing lab instance", error=str(e))
            # Continue anyway - better to potentially create duplicate than to fail
        
        # Connect to Docker daemon via mounted socket
        client = get_docker_client()
        
        # Prepare environment variables
        env = lab_template.get('env_json', {})
        env['CHALLENGE_INSTANCE_ID'] = challenge_instance_id
        
        # Placeholder for port mappings; we'll prefer detecting from image EXPOSEd ports
        ports = {}
        
        # Container labels for identification and cleanup
        labels = {
            'cte.challenge': lab_template['challenge_id'],
            'cte.instance': challenge_instance_id,
            'cte.template': lab_template['id'],
            'cte.created': datetime.utcnow().isoformat()
        }
        
        # If no prebuilt image provided, try to build from S3 context key
        image_name = lab_template.get('docker_image')
        if not image_name:
            try:
                s3_key = (lab_template.get('env_json') or {}).get('s3_build_context_key')
                if s3_key:
                    import boto3
                    import tempfile
                    import tarfile
                    s3_client = boto3.client(
                        's3',
                        endpoint_url=os.getenv('S3_ENDPOINT', 'http://minio:9000'),
                        aws_access_key_id=os.getenv('S3_ACCESS_KEY', 'minio'),
                        aws_secret_access_key=os.getenv('S3_SECRET_KEY', 'minio123')
                    )
                    bucket = os.getenv('S3_BUCKET', 'cte-artifacts')
                    with tempfile.TemporaryDirectory() as tmp:
                        tar_path = os.path.join(tmp, 'build.tar.gz')
                        with open(tar_path, 'wb') as f:
                            s3_client.download_fileobj(bucket, s3_key, f)
                        # Build image using tarball as context
                        tag = f"cte-lab-{challenge_instance_id[:8]}"
                        with open(tar_path, 'rb') as tf:
                            image_obj, _ = client.images.build(
                                fileobj=tf,
                                custom_context=True,
                                tag=tag,
                                rm=True
                            )
                        image_name = tag
                        # Detect EXPOSEd ports from built image
                        try:
                            exposed = image_obj.attrs.get('Config', {}).get('ExposedPorts') or image_obj.attrs.get('ContainerConfig', {}).get('ExposedPorts') or {}
                            detected_ports = {}
                            for key in exposed.keys():
                                detected_ports[key] = None
                            if detected_ports:
                                ports = detected_ports
                        except Exception:
                            pass
            except Exception as e:
                logger.error("Failed to build lab image from S3 context", error=str(e))
                image_name = None

        # If image exists but no ports decided yet, detect EXPOSEd ports from image metadata
        if image_name and not ports:
            try:
                img = client.images.get(image_name)
                exposed = img.attrs.get('Config', {}).get('ExposedPorts') or img.attrs.get('ContainerConfig', {}).get('ExposedPorts') or {}
                detected_ports = {}
                for key in (exposed.keys() if isinstance(exposed, dict) else []):
                    detected_ports[key] = None
                if detected_ports:
                    ports = detected_ports
            except Exception:
                pass

        # If still no ports detected, default to 80/tcp for web services
        if not ports:
            ports = {"80/tcp": None}

        # Run container
        if image_name:
            # Single container mode - explicitly create with port bindings
            # First create the container without starting it
            host_config = client.api.create_host_config(
                port_bindings={container_port: None for container_port in ports.keys()},
                mem_limit='512m',
                cpu_quota=100000,
                restart_policy={'Name': 'unless-stopped'}
            )
            
            networking_config = client.api.create_networking_config({
                'ctfd_lab-net': client.api.create_endpoint_config()
            })
            
            container_config = client.api.create_container(
                image_name,
                detach=True,
                environment=env,
                labels=labels,
                host_config=host_config,
                networking_config=networking_config
            )
            
            container = client.containers.get(container_config['Id'])
            container.start()
            # Resolve actual published host ports and IP
            try:
                container.reload()
            except Exception as e:
                logger.warning("Failed to reload container", error=str(e))
            
            # Get the actual port bindings assigned by Docker
            try:
                actual_port_bindings = container.attrs.get('NetworkSettings', {}).get('Ports') or {}
            except Exception as e:
                logger.warning("Failed to get port bindings", error=str(e))
                actual_port_bindings = {}
            
            try:
                ip_addr = container.attrs['NetworkSettings']['Networks']['ctfd_lab-net']['IPAddress']
            except Exception:
                ip_addr = None

            # Extract exposed ports for the frontend
            exposed_ports = {}
            for container_port, bindings in actual_port_bindings.items():
                if bindings:
                    for binding in bindings:
                        # binding is like {'HostIp': '0.0.0.0', 'HostPort': '32768'}
                        host_port = binding.get('HostPort')
                        if host_port:
                            exposed_ports[container_port] = host_port

            result = {
                'status': 'RUNNING',
                'container_id': container.id,
                'container_name': container.name,
                'ip_address': ip_addr,
                'ports': actual_port_bindings,
                'exposed_ports': exposed_ports
            }
        
        elif lab_template.get('compose_yaml_s3_key'):
            # Compose mode: delegate to compose task
            from .labs import start_lab_compose
            compose_result = start_lab_compose.apply_async(args=[lab_template['compose_yaml_s3_key'], challenge_instance_id, env]).get()
            result = compose_result
        
        else:
            raise ValueError("Lab template must specify either docker_image or compose_yaml_s3_key")
        
        # Schedule automatic cleanup
        ttl_minutes = lab_template.get('ttl_minutes', 60)
        cleanup_at = datetime.utcnow() + timedelta(minutes=ttl_minutes)
        try:
            # Best-effort schedule global cleanup
            from .labs import cleanup_expired_labs
            cleanup_expired_labs.apply_async(countdown=ttl_minutes * 60)
        except Exception:
            pass

        # Update DB LabInstance status via API
        try:
            import requests
            api_url = os.getenv('API_URL', 'http://api:8000')
            internal_key = os.getenv('INTERNAL_API_KEY', 'change_me_in_production')
            
            update_data = {
                'challenge_instance_id': challenge_instance_id,
                'status': 'RUNNING',
                'container_id': result.get('container_id'),
                'container_name': result.get('container_name'),
                'ip_address': result.get('ip_address'),
                'exposed_ports': json.dumps(result.get('ports', {})),
                'started_at': datetime.utcnow().isoformat(),
                'expires_at': cleanup_at.isoformat()
            }
            
            response = requests.post(
                f"{api_url}/api/internal/lab-instance/update-status",
                json=update_data,
                params={'api_key': internal_key},
                timeout=5
            )
            
            if response.status_code == 200:
                logger.info("Lab instance DB updated successfully via API", 
                           challenge_instance_id=challenge_instance_id,
                           exposed_ports=result.get('ports'))
            else:
                logger.error("Failed to update lab instance via API",
                            challenge_instance_id=challenge_instance_id,
                            status_code=response.status_code,
                            response=response.text)
        except Exception as e:
            logger.error("Failed to update DB LabInstance via API", 
                        error=str(e),
                        challenge_instance_id=challenge_instance_id)
        
        logger.info("Lab instance started",
                   challenge_instance_id=challenge_instance_id,
                   container_id=result['container_id'])
        
        return result
        
    except Exception as e:
        logger.error("Lab instance start failed",
                    error=str(e),
                    challenge_instance_id=challenge_instance_id)
        # Update DB LabInstance to FAILED via API
        try:
            import requests
            api_url = os.getenv('API_URL', 'http://api:8000')
            internal_key = os.getenv('INTERNAL_API_KEY', 'change_me_in_production')
            
            update_data = {
                'challenge_instance_id': challenge_instance_id,
                'status': 'FAILED',
                'error_message': str(e)
            }
            
            requests.post(
                f"{api_url}/api/internal/lab-instance/update-status",
                json=update_data,
                params={'api_key': internal_key},
                timeout=5
            )
        except Exception:
            pass
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
        client = get_docker_client()
        
        container = client.containers.get(container_id)
        container.stop(timeout=10)
        container.remove()
        # Update DB status
        try:
            # Import from mounted API directory
            import importlib.util
            
            db_spec = importlib.util.spec_from_file_location("database_module", "/api_src/database.py")
            db_module = importlib.util.module_from_spec(db_spec)
            db_spec.loader.exec_module(db_module)
            
            lab_spec = importlib.util.spec_from_file_location("lab_module", "/api_src/models/lab.py")
            lab_module = importlib.util.module_from_spec(lab_spec)
            lab_spec.loader.exec_module(lab_module)
            
            SessionLocal = db_module.SessionLocal
            LabInstance = lab_module.LabInstance
            LabInstanceStatus = lab_module.LabInstanceStatus
            db = SessionLocal()
            try:
                lab = db.query(LabInstance).filter(LabInstance.container_id == container_id).first()
                if lab:
                    lab.status = LabInstanceStatus.STOPPED
                    lab.torn_down_at = datetime.utcnow()
                    db.commit()
            finally:
                db.close()
        except Exception:
            pass
        
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
    Clean up expired lab instances using database records
    """
    try:
        # Import database here to avoid circular imports
        import importlib.util
        
        db_spec = importlib.util.spec_from_file_location("database_module", "/api_src/database.py")
        db_module = importlib.util.module_from_spec(db_spec)
        db_spec.loader.exec_module(db_module)
        
        lab_spec = importlib.util.spec_from_file_location("lab_module", "/api_src/models/lab.py")
        lab_module = importlib.util.module_from_spec(lab_spec)
        lab_spec.loader.exec_module(lab_module)
        
        SessionLocal = db_module.SessionLocal
        LabInstance = lab_module.LabInstance
        LabInstanceStatus = lab_module.LabInstanceStatus
        
        db = SessionLocal()
        
        try:
            # Find expired lab instances
            expired_labs = db.query(LabInstance).filter(
                LabInstance.expires_at <= datetime.utcnow(),
                LabInstance.status.in_([LabInstanceStatus.RUNNING, LabInstanceStatus.STARTING])
            ).all()
            
            client = get_docker_client()
            cleaned_count = 0
            
            for lab in expired_labs:
                try:
                    if lab.container_id:
                        # Stop and remove container
                        container = client.containers.get(lab.container_id)
                        container.stop(timeout=10)
                        container.remove()
                        logger.info("Cleaned up expired lab container", 
                                   container_id=lab.container_id,
                                   lab_instance_id=str(lab.id))
                    
                    # Update database status
                    lab.status = LabInstanceStatus.STOPPED
                    lab.torn_down_at = datetime.utcnow()
                    cleaned_count += 1
                    
                except docker.errors.NotFound:
                    # Container already gone, just update DB
                    lab.status = LabInstanceStatus.STOPPED
                    lab.torn_down_at = datetime.utcnow()
                    logger.warning("Lab container not found, updating DB only",
                                  container_id=lab.container_id)
                except Exception as e:
                    logger.error("Failed to cleanup lab instance",
                                lab_instance_id=str(lab.id),
                                error=str(e))
            
            db.commit()
            
            # Also clean up orphaned containers (fallback)
            containers = client.containers.list(
                filters={'label': 'cte.instance'},
                all=True
            )
            
            for container in containers:
                try:
                    created_str = container.labels.get('cte.created')
                    if created_str:
                        created_time = datetime.fromisoformat(created_str.replace('Z', '+00:00'))
                        # Clean up containers older than 4 hours (safety margin)
                        if datetime.utcnow() - created_time > timedelta(hours=4):
                            container.stop(timeout=10)
                            container.remove()
                            cleaned_count += 1
                            logger.info("Cleaned up orphaned lab container", 
                                       container_id=container.id)
                except Exception as e:
                    logger.error("Failed to cleanup orphaned container",
                                container_id=container.id,
                                error=str(e))
            
            logger.info("Lab cleanup completed", cleaned_count=cleaned_count)
            return {'cleaned_count': cleaned_count}
            
        finally:
            db.close()
        
    except Exception as e:
        logger.error("Lab cleanup failed", error=str(e))
        return {'error': str(e)}

@app.task(bind=True)
def start_lab_compose(self, compose_yaml_s3_key: str, challenge_instance_id: str, env_vars: dict):
    """
    Start a lab using docker-compose
    
    Args:
        compose_yaml_s3_key: S3 key for docker-compose.yml
        challenge_instance_id: Associated challenge instance ID
        env_vars: Environment variables to pass to compose
    """
    try:
        import tempfile
        import subprocess
        import boto3
        
        # Download compose file from S3
        s3_client = boto3.client(
            's3',
            endpoint_url=os.getenv('S3_ENDPOINT', 'http://minio:9000'),
            aws_access_key_id=os.getenv('S3_ACCESS_KEY', 'minio'),
            aws_secret_access_key=os.getenv('S3_SECRET_KEY', 'minio123')
        )
        bucket = os.getenv('S3_BUCKET', 'cte-artifacts')
        
        with tempfile.TemporaryDirectory() as temp_dir:
            compose_file = os.path.join(temp_dir, 'docker-compose.yml')
            
            # Download compose file
            s3_client.download_file(bucket, compose_yaml_s3_key, compose_file)
            
            # Prepare environment
            env = os.environ.copy()
            env.update(env_vars)
            env['CHALLENGE_INSTANCE_ID'] = challenge_instance_id
            
            # Generate unique project name
            project_name = f"cte-lab-{challenge_instance_id[:8]}"
            
            # Start services
            cmd = [
                'docker-compose',
                '-f', compose_file,
                '-p', project_name,
                'up', '-d'
            ]
            
            result = subprocess.run(
                cmd,
                cwd=temp_dir,
                env=env,
                capture_output=True,
                text=True,
                timeout=300  # 5 minute timeout
            )
            
            if result.returncode != 0:
                raise Exception(f"docker-compose failed: {result.stderr}")
            
            # Get container IDs
            containers_cmd = [
                'docker-compose',
                '-f', compose_file,
                '-p', project_name,
                'ps', '-q'
            ]
            
            containers_result = subprocess.run(
                containers_cmd,
                cwd=temp_dir,
                env=env,
                capture_output=True,
                text=True
            )
            
            container_ids = [c for c in containers_result.stdout.strip().split('\n') if c]

            # Resolve published ports from docker inspect
            import json as _json
            published = {}
            try:
                for cid in container_ids:
                    insp = subprocess.run(['docker', 'inspect', cid], capture_output=True, text=True)
                    if insp.returncode == 0:
                        info = _json.loads(insp.stdout)[0]
                        ports = info.get('NetworkSettings', {}).get('Ports') or {}
                        for k, v in (ports.items() if isinstance(ports, dict) else []):
                            # merge bindings
                            arr = published.get(k) or []
                            if v:
                                arr.extend(v)
                            published[k] = arr
            except Exception:
                published = {}
            
            logger.info("Lab compose started",
                       challenge_instance_id=challenge_instance_id,
                       project_name=project_name,
                       containers=container_ids)
            
            return {
                'status': 'RUNNING',
                'project_name': project_name,
                'container_ids': container_ids,
                'ports': published
            }
            
    except Exception as e:
        logger.error("Lab compose start failed",
                    challenge_instance_id=challenge_instance_id,
                    error=str(e))
        return {
            'status': 'ERROR',
            'error': str(e)
        }
