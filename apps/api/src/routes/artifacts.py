from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
import boto3
import os
from datetime import timedelta

from ..database import get_db
from ..models.user import User
from ..models.challenge import Artifact, Challenge
from ..models.season import WeekChallenge, Week
from ..utils.auth import get_current_user
from ..utils.logging import get_logger

logger = get_logger(__name__)

router = APIRouter()

@router.get("/artifacts/{artifact_id}/download")
async def download_artifact(
    artifact_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Download an artifact via signed URL"""
    
    # Get artifact
    artifact = db.query(Artifact).filter(Artifact.id == artifact_id).first()
    if not artifact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Artifact not found"
        )
    
    # Get challenge to check access
    challenge = db.query(Challenge).filter(Challenge.id == artifact.challenge_id).first()
    if not challenge:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Challenge not found"
        )
    
    # Enforce access: must be published and within an open week mapping
    if challenge.status != "PUBLISHED":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Challenge not available")
    mapping = db.query(WeekChallenge, Week).join(Week, WeekChallenge.week_id == Week.id).filter(
        WeekChallenge.challenge_id == challenge.id
    ).first()
    if mapping:
        _, wk = mapping
        now = datetime.utcnow()
        if not (wk.opens_at <= now <= wk.closes_at):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Challenge not currently open")
    
    try:
        # Setup S3 client
        s3_client = boto3.client(
            's3',
            endpoint_url=os.getenv('S3_ENDPOINT', 'http://localhost:9000'),
            aws_access_key_id=os.getenv('S3_ACCESS_KEY', 'minio'),
            aws_secret_access_key=os.getenv('S3_SECRET_KEY', 'minio123')
        )
        bucket = os.getenv('S3_BUCKET', 'cte-artifacts')
        
        # Generate signed URL (5 minute expiry)
        signed_url = s3_client.generate_presigned_url(
            'get_object',
            Params={
                'Bucket': bucket,
                'Key': artifact.s3_key,
                'ResponseContentDisposition': f'attachment; filename="{artifact.original_filename}"'
            },
            ExpiresIn=300  # 5 minutes
        )
        
        logger.info("Artifact download requested",
                   artifact_id=artifact_id,
                   user_id=str(current_user.id),
                   challenge_id=str(challenge.id),
                   filename=artifact.original_filename)
        
        # Redirect to signed URL
        return RedirectResponse(url=signed_url, status_code=302)
        
    except Exception as e:
        logger.error("Artifact download failed",
                    artifact_id=artifact_id,
                    error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate download URL"
        )
