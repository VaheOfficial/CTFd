from fastapi import APIRouter, HTTPException, Depends, status, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
import uuid
from datetime import datetime

from ..database import get_db
from ..models.user import User
from ..models.challenge import Challenge, ChallengeStatus, Artifact, Hint, ValidatorConfig
from ..models.season import Season, Week
from ..models.audit import AuditLog
from ..models.leaderboard import LeaderboardSnapshot
from ..utils.auth import require_admin, require_author
from ..utils.logging import get_logger

logger = get_logger(__name__)

router = APIRouter()

class CreateChallengeRequest(BaseModel):
    challenge_yaml: Dict[str, Any]
    season_id: Optional[str] = None
    week_index: Optional[int] = None

class UpdateChallengeRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[ChallengeStatus] = None
    points_base: Optional[int] = None

class AuditLogResponse(BaseModel):
    id: str
    actor_user_id: Optional[str]
    action: str
    entity_type: str
    entity_id: str
    details_json: Dict[str, Any]
    created_at: datetime

@router.post("/challenges", status_code=status.HTTP_201_CREATED)
async def create_challenge(
    request: CreateChallengeRequest,
    current_user: User = Depends(require_author),
    db: Session = Depends(get_db)
):
    """Register a new challenge from challenge.yml"""
    
    try:
        challenge_data = request.challenge_yaml
        
        # Validate required fields
        required_fields = ['id', 'title', 'track', 'difficulty', 'points', 'time_cap_minutes', 'mode']
        for field in required_fields:
            if field not in challenge_data:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Missing required field: {field}"
                )
        
        # Check if challenge ID already exists
        existing = db.query(Challenge).filter(Challenge.slug == challenge_data['id']).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Challenge with ID '{challenge_data['id']}' already exists"
            )
        
        # Create challenge
        challenge = Challenge(
            id=str(uuid.uuid4()),
            slug=challenge_data['id'],
            title=challenge_data['title'],
            track=challenge_data['track'],
            difficulty=challenge_data['difficulty'],
            points_base=challenge_data['points'].get('base', challenge_data['points']) if isinstance(challenge_data['points'], dict) else challenge_data['points'],
            time_cap_minutes=challenge_data['time_cap_minutes'],
            mode=challenge_data['mode'],
            status=ChallengeStatus.READY,
            author_id=current_user.id,
            description=challenge_data.get('description', '')
        )
        
        db.add(challenge)
        db.flush()  # Get challenge ID
        
        # Create artifacts
        if 'artifacts' in challenge_data:
            for artifact_data in challenge_data['artifacts']:
                artifact = Artifact(
                    challenge_id=challenge.id,
                    s3_key=artifact_data.get('s3_key', ''),
                    sha256=artifact_data.get('sha256', ''),
                    size_bytes=artifact_data.get('size_bytes', 0),
                    kind=artifact_data.get('kind', 'other'),
                    original_filename=artifact_data.get('path', 'unknown')
                )
                db.add(artifact)
        
        # Create hints
        if 'hints' in challenge_data:
            for i, hint_data in enumerate(challenge_data['hints']):
                hint = Hint(
                    challenge_id=challenge.id,
                    order=hint_data.get('order', i + 1),
                    text=hint_data['text'],
                    cost_percent=hint_data['cost_percent']
                )
                db.add(hint)
        
        # Create validator config if present
        if 'validator' in challenge_data:
            validator_data = challenge_data['validator']
            validator = ValidatorConfig(
                challenge_id=challenge.id,
                type=validator_data['type'],
                image=validator_data.get('image'),
                command=validator_data.get('cmd'),
                timeout_sec=validator_data.get('timeout_sec', 30),
                network_policy=validator_data.get('network_policy', 'none')
            )
            db.add(validator)
        
        # Audit log
        audit = AuditLog(
            actor_user_id=current_user.id,
            action="challenge_created",
            entity_type="challenge",
            entity_id=str(challenge.id),
            details_json={
                "slug": challenge.slug,
                "title": challenge.title,
                "track": challenge.track,
                "difficulty": challenge.difficulty
            }
        )
        db.add(audit)
        
        db.commit()
        
        logger.info("Challenge created successfully", 
                   challenge_id=str(challenge.id),
                   slug=challenge.slug)
        
        return {
            "challenge_id": str(challenge.id),
            "slug": challenge.slug,
            "status": challenge.status
        }
        
    except Exception as e:
        logger.error("Challenge creation failed", error=str(e))
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Challenge creation failed: {str(e)}"
        )

@router.patch("/challenges/{challenge_id}")
async def update_challenge(
    challenge_id: str,
    request: UpdateChallengeRequest,
    current_user: User = Depends(require_author),
    db: Session = Depends(get_db)
):
    """Update an existing challenge"""
    
    challenge = db.query(Challenge).filter(Challenge.id == challenge_id).first()
    if not challenge:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Challenge not found"
        )
    
    # Store original values for audit
    original_values = {
        "title": challenge.title,
        "description": challenge.description,
        "status": challenge.status,
        "points_base": challenge.points_base
    }
    
    # Update fields
    if request.title is not None:
        challenge.title = request.title
    if request.description is not None:
        challenge.description = request.description
    if request.status is not None:
        # Validate status transition
        if not _is_valid_status_transition(challenge.status, request.status):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status transition from {challenge.status} to {request.status}"
            )
        challenge.status = request.status
    if request.points_base is not None:
        challenge.points_base = request.points_base
    
    challenge.updated_at = datetime.utcnow()
    
    # Audit log with before/after
    changes = {}
    for field, original in original_values.items():
        current = getattr(challenge, field)
        if current != original:
            changes[field] = {"from": original, "to": current}
    
    if changes:
        audit = AuditLog(
            actor_user_id=current_user.id,
            action="challenge_updated",
            entity_type="challenge",
            entity_id=challenge_id,
            details_json={"changes": changes}
        )
        db.add(audit)
    
    db.commit()
    
    return {
        "challenge_id": challenge_id,
        "status": challenge.status,
        "changes": changes
    }

@router.get("/audit", response_model=List[AuditLogResponse])
async def get_audit_logs(
    actor: Optional[str] = Query(None, description="Filter by actor user ID"),
    entity_type: Optional[str] = Query(None, description="Filter by entity type"),
    since: Optional[datetime] = Query(None, description="Filter logs since this timestamp"),
    until: Optional[datetime] = Query(None, description="Filter logs until this timestamp"),
    limit: int = Query(50, le=200, description="Maximum number of logs to return"),
    cursor: Optional[str] = Query(None, description="Pagination cursor"),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get audit logs (admin only)"""
    
    query = db.query(AuditLog)
    
    # Apply filters
    if actor:
        query = query.filter(AuditLog.actor_user_id == actor)
    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type)
    if since:
        query = query.filter(AuditLog.created_at >= since)
    if until:
        query = query.filter(AuditLog.created_at <= until)
    
    # Pagination
    if cursor:
        query = query.filter(AuditLog.created_at < cursor)
    
    # Order and limit
    query = query.order_by(AuditLog.created_at.desc()).limit(limit)
    
    logs = query.all()
    
    return [
        AuditLogResponse(
            id=str(log.id),
            actor_user_id=str(log.actor_user_id) if log.actor_user_id else None,
            action=log.action,
            entity_type=log.entity_type,
            entity_id=log.entity_id,
            details_json=log.details_json,
            created_at=log.created_at
        )
        for log in logs
    ]

@router.post("/leaderboard/snapshot")
async def create_leaderboard_snapshot(
    season_id: str,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Generate leaderboard snapshot for a season"""
    
    season = db.query(Season).filter(Season.id == season_id).first()
    if not season:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Season not found"
        )
    
    try:
        # TODO: Implement leaderboard calculation logic
        # For now, create a placeholder snapshot
        snapshot_data = {
            "season_id": season_id,
            "generated_at": datetime.utcnow().isoformat(),
            "participants": [],
            "teams": [],
            "total_participants": 0,
            "challenges_completed": 0
        }
        
        snapshot = LeaderboardSnapshot(
            season_id=season_id,
            json_blob=snapshot_data
        )
        
        db.add(snapshot)
        
        # Audit log
        audit = AuditLog(
            actor_user_id=current_user.id,
            action="leaderboard_snapshot_created",
            entity_type="season",
            entity_id=season_id,
            details_json={"snapshot_id": str(snapshot.id)}
        )
        db.add(audit)
        
        db.commit()
        
        return {
            "snapshot_id": str(snapshot.id),
            "season_id": season_id,
            "status": "completed"
        }
        
    except Exception as e:
        logger.error("Leaderboard snapshot creation failed", 
                    season_id=season_id, 
                    error=str(e))
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Snapshot creation failed: {str(e)}"
        )

def _is_valid_status_transition(current: ChallengeStatus, new: ChallengeStatus) -> bool:
    """Validate challenge status transitions"""
    
    valid_transitions = {
        ChallengeStatus.DRAFT: [ChallengeStatus.READY, ChallengeStatus.ARCHIVED],
        ChallengeStatus.READY: [ChallengeStatus.PUBLISHED, ChallengeStatus.ARCHIVED],
        ChallengeStatus.PUBLISHED: [ChallengeStatus.ARCHIVED],
        ChallengeStatus.ARCHIVED: []  # Final state
    }
    
    return new in valid_transitions.get(current, [])
