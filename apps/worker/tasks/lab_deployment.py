from celery import Celery
from datetime import datetime, timedelta
import structlog
import os
import sys

# Add API path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
from api.src.database import SessionLocal
from api.src.models.lab import LabInstance, LabStatus, LabTemplate
from api.src.models.challenge import ChallengeInstance

from ..services.lab_manager import LabManager

logger = structlog.get_logger(__name__)
app = Celery('cte-worker')

@app.task(bind=True)
def deploy_lab_instance(
    self,
    template_id: str,
    challenge_instance_id: str,
    expires_in_minutes: int = 60
) -> dict:
    """Deploy a new lab instance for a challenge"""
    
    db = SessionLocal()
    lab_manager = LabManager()
    
    try:
        # Get template and challenge instance
        template = db.query(LabTemplate).filter(LabTemplate.id == template_id).first()
        if not template:
            raise ValueError(f"Lab template {template_id} not found")
            
        challenge_instance = db.query(ChallengeInstance).filter(
            ChallengeInstance.id == challenge_instance_id
        ).first()
        if not challenge_instance:
            raise ValueError(f"Challenge instance {challenge_instance_id} not found")
        
        # Create lab instance record
        lab_instance = LabInstance(
            template_id=template_id,
            challenge_instance_id=challenge_instance_id,
            status=LabStatus.PENDING,
            network_type=template.network_config.get('type', 'isolated'),
            expires_at=datetime.utcnow() + timedelta(minutes=expires_in_minutes)
        )
        db.add(lab_instance)
        db.flush()  # Get lab instance ID
        
        try:
            # Deploy container/VM
            result = lab_manager.create_instance(
                template_id=str(template.id),
                challenge_instance_id=str(challenge_instance.id),
                image=template.image,
                resource_limits=template.resource_limits,
                network_config=template.network_config,
                startup_script=template.startup_script,
                exposed_ports=template.exposed_ports,
                environment=template.environment,
                expires_in_minutes=expires_in_minutes
            )
            
            # Update lab instance with deployment info
            lab_instance.status = LabStatus.RUNNING
            lab_instance.container_id = result['container_id']
            lab_instance.ip_address = result['ip_address']
            lab_instance.started_at = datetime.fromisoformat(result['started_at'])
            lab_instance.expires_at = datetime.fromisoformat(result['expires_at'])
            
            db.commit()
            
            return {
                'status': 'success',
                'lab_instance_id': str(lab_instance.id),
                'container_id': result['container_id'],
                'ip_address': result['ip_address']
            }
            
        except Exception as e:
            # Update lab instance with error
            lab_instance.status = LabStatus.FAILED
            lab_instance.error_message = str(e)
            db.commit()
            raise
            
    except Exception as e:
        logger.error("Lab deployment failed",
                    error=str(e),
                    template_id=template_id,
                    challenge_instance_id=challenge_instance_id)
        db.rollback()
        raise
        
    finally:
        db.close()

@app.task(bind=True)
def terminate_lab_instance(self, lab_instance_id: str) -> dict:
    """Terminate a lab instance"""
    
    db = SessionLocal()
    lab_manager = LabManager()
    
    try:
        # Get lab instance
        lab_instance = db.query(LabInstance).filter(LabInstance.id == lab_instance_id).first()
        if not lab_instance:
            raise ValueError(f"Lab instance {lab_instance_id} not found")
            
        if lab_instance.container_id:
            # Stop and remove container
            lab_manager.stop_instance(lab_instance.container_id)
            
        # Update lab instance status
        lab_instance.status = LabStatus.TERMINATED
        lab_instance.updated_at = datetime.utcnow()
        db.commit()
        
        return {
            'status': 'success',
            'lab_instance_id': lab_instance_id
        }
        
    except Exception as e:
        logger.error("Lab termination failed",
                    error=str(e),
                    lab_instance_id=lab_instance_id)
        db.rollback()
        raise
        
    finally:
        db.close()

@app.task(bind=True)
def cleanup_expired_labs(self) -> dict:
    """Cleanup expired lab instances"""
    
    db = SessionLocal()
    lab_manager = LabManager()
    
    try:
        # Find expired instances
        expired = db.query(LabInstance).filter(
            LabInstance.status == LabStatus.RUNNING,
            LabInstance.expires_at < datetime.utcnow()
        ).all()
        
        terminated_count = 0
        for instance in expired:
            try:
                if instance.container_id:
                    lab_manager.stop_instance(instance.container_id)
                    
                instance.status = LabStatus.TERMINATED
                instance.updated_at = datetime.utcnow()
                terminated_count += 1
                
            except Exception as e:
                logger.error("Failed to cleanup lab instance",
                           error=str(e),
                           lab_instance_id=str(instance.id))
        
        db.commit()
        
        # Cleanup any orphaned containers
        lab_manager.cleanup_expired()
        
        return {
            'status': 'success',
            'terminated_count': terminated_count
        }
        
    except Exception as e:
        logger.error("Lab cleanup failed", error=str(e))
        db.rollback()
        raise
        
    finally:
        db.close()
