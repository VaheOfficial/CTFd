from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.responses import RedirectResponse, FileResponse, StreamingResponse
from sqlalchemy.orm import Session
import boto3
import os
from datetime import timedelta, datetime
from pathlib import Path
import mimetypes
from botocore.config import Config
from botocore.exceptions import ClientError

from ..database import get_db
from ..models.user import User
from ..models.challenge import Artifact, Challenge, ChallengeStatus
from ..models.season import WeekChallenge, Week
from ..utils.auth import get_current_user_optional
from ..utils.logging import get_logger

logger = get_logger(__name__)

router = APIRouter()

@router.get("/artifacts/{artifact_id}/download")
async def download_artifact(
    artifact_id: str,
    current_user: User = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """Download an artifact by proxying from MinIO (no public S3 links)."""
    
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
    if challenge.status != ChallengeStatus.PUBLISHED:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Challenge not available")
    mapping = db.query(WeekChallenge, Week).join(Week, WeekChallenge.week_id == Week.id).filter(
        WeekChallenge.challenge_id == challenge.id
    ).first()
    if mapping:
        _, wk = mapping
        now = datetime.utcnow()
        if not (wk.opens_at <= now <= wk.closes_at):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Challenge not currently open")
    
    # Prefer S3 download if available
    s3_disabled = os.getenv('S3_DISABLED', '0') in ['1', 'true', 'True']
    if artifact.s3_key and not s3_disabled:
        try:
            # Internal S3 client (container network)
            s3_client_internal = boto3.client(
                's3',
                endpoint_url=os.getenv('S3_ENDPOINT', 'http://minio:9000'),
                aws_access_key_id=os.getenv('S3_ACCESS_KEY', 'minio'),
                aws_secret_access_key=os.getenv('S3_SECRET_KEY', 'minio123'),
                config=Config(signature_version='s3v4', s3={'addressing_style': 'path'})
            )
            bucket = os.getenv('S3_BUCKET', 'cte-artifacts')

            # Stream object directly from MinIO → client
            try:
                obj = s3_client_internal.get_object(Bucket=bucket, Key=artifact.s3_key)
                body = obj['Body']

                def stream_body():
                    try:
                        while True:
                            chunk = body.read(64 * 1024)
                            if not chunk:
                                break
                            yield chunk
                    finally:
                        try:
                            body.close()
                        except Exception:
                            pass

                media_type = (obj.get('ContentType')
                              or mimetypes.guess_type(artifact.original_filename)[0]
                              or 'application/octet-stream')

                headers = {
                    'Content-Disposition': f'attachment; filename="{artifact.original_filename}"'
                }
                if 'ContentLength' in obj:
                    try:
                        headers['Content-Length'] = str(obj['ContentLength'])
                    except Exception:
                        pass

                logger.info("Artifact download (S3 proxy)",
                           artifact_id=artifact_id,
                           user_id=str(current_user.id) if current_user else None,
                           challenge_id=str(challenge.id),
                           filename=artifact.original_filename)
                return StreamingResponse(stream_body(), media_type=media_type, headers=headers)
            except ClientError:
                # Will attempt local fallback below
                pass
        except Exception as e:
            # Log but fall back to local if possible
            logger.warning("S3 proxy failed, falling back to local cache",
                           artifact_id=artifact_id,
                           error=str(e))

    # Local cache fallback (mirrors S3 key space)
    try:
        storage_root = os.getenv('ARTIFACTS_DIR') or os.path.join(
            os.getenv('XDG_CACHE_HOME', os.path.expanduser('~/.cache')),
            'cte', 'artifacts'
        )
        if artifact.s3_key:
            local_path = Path(storage_root) / artifact.s3_key
        else:
            # No s3_key; cannot locate cache path reliably
            local_path = None

        if local_path and local_path.exists() and local_path.is_file():
            media_type, _ = mimetypes.guess_type(artifact.original_filename)
            logger.info("Artifact download (local cache)",
                       artifact_id=artifact_id,
                       user_id=str(current_user.id) if current_user else None,
                       challenge_id=str(challenge.id),
                       filename=artifact.original_filename)
            return FileResponse(
                path=str(local_path),
                media_type=media_type or 'application/octet-stream',
                filename=artifact.original_filename
            )
    except Exception as e:
        logger.error("Local cache download failed",
                     artifact_id=artifact_id,
                     error=str(e))

    # If we reach here, we couldn't serve the artifact
    raise HTTPException(
        status_code=status.HTTP_502_BAD_GATEWAY,
        detail="Artifact unavailable (not found in S3 or local cache)"
    )
