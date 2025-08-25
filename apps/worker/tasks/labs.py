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
    Clean up expired lab instances using database records
    """
    try:
        # Import database here to avoid circular imports
        import os
        import sys
        sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
        
        from apps.api.src.database import SessionLocal
        from apps.api.src.models.lab import LabInstance, LabInstanceStatus
        from datetime import datetime
        
        db = SessionLocal()
        
        try:
            # Find expired lab instances
            expired_labs = db.query(LabInstance).filter(
                LabInstance.expires_at <= datetime.utcnow(),
                LabInstance.status.in_([LabInstanceStatus.RUNNING, LabInstanceStatus.STARTING])
            ).all()
            
            client = docker.from_env()
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
            
            container_ids = containers_result.stdout.strip().split('\n')
            
            logger.info("Lab compose started",
                       challenge_instance_id=challenge_instance_id,
                       project_name=project_name,
                       containers=container_ids)
            
            return {
                'status': 'RUNNING',
                'project_name': project_name,
                'container_ids': container_ids
            }
            
    except Exception as e:
        logger.error("Lab compose start failed",
                    challenge_instance_id=challenge_instance_id,
                    error=str(e))
        return {
            'status': 'ERROR',
            'error': str(e)
        }
