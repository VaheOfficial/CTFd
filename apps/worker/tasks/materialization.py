from celery import Celery
import tempfile
import hashlib
import boto3
import os
from pathlib import Path
import structlog

logger = structlog.get_logger(__name__)

app = Celery('cte-worker')

@app.task(bind=True)
def materialize_artifacts(self, challenge_id: str, artifacts_plan: list):
    """
    Materialize artifacts from AI generation plan
    
    Args:
        challenge_id: Challenge UUID
        artifacts_plan: List of artifact generation operations
    """
    try:
        # Import generators
        import sys
        sys.path.append(os.path.dirname(os.path.dirname(__file__)))
        from generators.utils import generate_artifact
        
        # Setup S3 client
        s3_client = boto3.client(
            's3',
            endpoint_url=os.getenv('S3_ENDPOINT', 'http://minio:9000'),
            aws_access_key_id=os.getenv('S3_ACCESS_KEY', 'minio'),
            aws_secret_access_key=os.getenv('S3_SECRET_KEY', 'minio123')
        )
        bucket = os.getenv('S3_BUCKET', 'cte-artifacts')
        
        materialized_artifacts = []
        trace_log = []
        
        for i, artifact_spec in enumerate(artifacts_plan):
            operation = artifact_spec['operation']
            params = artifact_spec.get('params', {})
            seed = artifact_spec.get('seed', 12345)
            
            logger.info("Generating artifact", 
                       operation=operation, 
                       challenge_id=challenge_id)
            
            # Generate artifact content
            content = generate_artifact(operation, params, seed)
            
            # Calculate hash
            sha256 = hashlib.sha256(content).hexdigest()
            
            # Determine filename and kind
            filename, kind = _get_artifact_info(operation, params, i)
            
            # Upload to S3
            s3_key = f"artifacts/{sha256[:2]}/{sha256[2:4]}/{sha256}"
            
            try:
                # Check if already exists
                s3_client.head_object(Bucket=bucket, Key=s3_key)
                logger.info("Artifact already exists in S3", s3_key=s3_key)
            except s3_client.exceptions.NoSuchKey:
                # Upload new artifact
                s3_client.put_object(
                    Bucket=bucket,
                    Key=s3_key,
                    Body=content,
                    ContentType=_get_content_type(kind)
                )
                logger.info("Uploaded artifact to S3", s3_key=s3_key)
            
            artifact_info = {
                's3_key': s3_key,
                'sha256': sha256,
                'size_bytes': len(content),
                'kind': kind,
                'original_filename': filename
            }
            
            materialized_artifacts.append(artifact_info)
            
            # Record trace
            trace_log.append({
                'operation': operation,
                'params': params,
                'seed': seed,
                'output': {
                    'filename': filename,
                    'kind': kind,
                    'size_bytes': len(content),
                    'sha256': sha256,
                    's3_key': s3_key
                }
            })
        
        # Update database with materialized artifacts
        _update_challenge_artifacts(challenge_id, materialized_artifacts, trace_log)
        
        logger.info("Artifact materialization completed",
                   challenge_id=challenge_id,
                   artifacts_count=len(materialized_artifacts))
        
        return {
            'status': 'completed',
            'artifacts': materialized_artifacts,
            'trace': trace_log
        }
        
    except Exception as e:
        logger.error("Artifact materialization failed",
                    challenge_id=challenge_id,
                    error=str(e))
        
        # Update generation plan status to failed
        _update_generation_status(challenge_id, 'FAILED', str(e))
        
        return {
            'status': 'failed',
            'error': str(e)
        }

def _get_artifact_info(operation: str, params: dict, index: int) -> tuple[str, str]:
    """Determine filename and kind based on operation"""
    
    operation_mapping = {
        'corrupt_png_magic': ('corrupted_image.jpg', 'image'),
        'synthesize_dns_tunnel_csv': ('dns_logs.csv', 'csv'),
        'make_pcap_beacon': ('beacon_traffic.pcap', 'pcap'),
        'make_edr_json_lolbin': ('edr_events.json', 'jsonl'),
        'slice_winsec_logs_4769': ('security_events.csv', 'csv'),
        'make_eml_phish': ('phishing_email.eml', 'eml'),
        'kubeyaml_insecure_mount': ('deployment.yaml', 'other'),
        'iam_policy_overbroad': ('policy.json', 'other'),
        'http_logs_idor': ('access_logs.csv', 'csv'),
        'azure_signin_json': ('signin_logs.json', 'jsonl'),
        'pack_zip': ('artifacts.zip', 'zip')
    }
    
    if operation in operation_mapping:
        base_name, kind = operation_mapping[operation]
        # Add index if multiple artifacts of same type
        if index > 0:
            name_parts = base_name.rsplit('.', 1)
            if len(name_parts) == 2:
                filename = f"{name_parts[0]}_{index + 1}.{name_parts[1]}"
            else:
                filename = f"{base_name}_{index + 1}"
        else:
            filename = base_name
        return filename, kind
    else:
        return f"artifact_{index + 1}.bin", 'other'

def _get_content_type(kind: str) -> str:
    """Get MIME content type for artifact kind"""
    
    content_types = {
        'csv': 'text/csv',
        'pcap': 'application/vnd.tcpdump.pcap',
        'jsonl': 'application/json',
        'eml': 'message/rfc822',
        'image': 'image/jpeg',
        'zip': 'application/zip',
        'other': 'application/octet-stream'
    }
    
    return content_types.get(kind, 'application/octet-stream')

def _update_challenge_artifacts(challenge_id: str, artifacts: list, trace_log: list):
    """Update challenge with materialized artifacts"""
    
    # This would normally use the database session
    # For now, we'll log the operation
    logger.info("Would update challenge artifacts",
               challenge_id=challenge_id,
               artifacts_count=len(artifacts))
    
    # TODO: Update Challenge.artifacts and GenerationPlan.materialization_trace
    # This requires database access from worker context

def _update_generation_status(challenge_id: str, status: str, error_message: str = None):
    """Update generation plan status"""
    
    logger.info("Would update generation status",
               challenge_id=challenge_id,
               status=status,
               error=error_message)
    
    # TODO: Update GenerationPlan.status and error_message
    # This requires database access from worker context
