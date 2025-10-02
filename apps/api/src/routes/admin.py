from fastapi import APIRouter, HTTPException, Depends, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
import uuid
from datetime import datetime

from ..database import get_db
from ..models.user import User
from ..models.challenge import Challenge, ChallengeStatus, Artifact, Hint, ValidatorConfig, HintConsumption, FlagType
from ..models.season import Season, Week
from ..models.audit import AuditLog
from ..models.leaderboard import LeaderboardSnapshot
from ..models.submission import Submission
from ..models.two_factor import TwoFactorSettings
from ..models.lab import LabTemplate
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
    slug: Optional[str] = None
    description: Optional[str] = None
    status: Optional[ChallengeStatus] = None
    points_base: Optional[int] = None
    time_cap_minutes: Optional[int] = None
    track: Optional[str] = None
    difficulty: Optional[str] = None
    mode: Optional[str] = None
    flag_type: Optional[str] = None
    flag_format: Optional[str] = None
    static_flag: Optional[str] = None

class AuditLogResponse(BaseModel):
    id: str
    actor_user_id: Optional[str]
    actor_username: Optional[str] = None
    action: str
    entity_type: str
    entity_id: str
    details_json: Dict[str, Any]
    created_at: datetime
    ip_address: Optional[str] = None
    severity: Optional[str] = "info"

class AdminStatsResponse(BaseModel):
    total_users: int
    active_seasons: int
    total_challenges: int
    pending_challenges: int
    this_week_submissions: int
    ai_generations_today: int

@router.get("/stats", response_model=AdminStatsResponse)
async def get_admin_stats(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Aggregated admin dashboard statistics"""
    # Total users
    total_users = db.query(func.count(User.id)).scalar() or 0

    # Active seasons
    now = datetime.now()
    active_seasons = db.query(Season).filter(Season.start_at <= now, Season.end_at >= now).count()

    # Total challenges and pending (DRAFT/READY) counts
    total_challenges = db.query(Challenge).count()
    pending_challenges = db.query(Challenge).filter(Challenge.status.in_([ChallengeStatus.DRAFT, ChallengeStatus.READY])).count()

    # This week's submissions (UTC week window)
    from datetime import timedelta
    start_of_week = now - timedelta(days=now.weekday())
    start_of_week = start_of_week.replace(hour=0, minute=0, second=0, microsecond=0)
    this_week_submissions = db.query(Submission).filter(Submission.created_at >= start_of_week).count()

    # AI generations today (best-effort from AuditLog)
    start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
    ai_generations_today = db.query(AuditLog).filter(
        AuditLog.action == "ai_challenge_generated",
        AuditLog.created_at >= start_of_day
    ).count()

    return AdminStatsResponse(
        total_users=int(total_users),
        active_seasons=int(active_seasons or 0),
        total_challenges=int(total_challenges or 0),
        pending_challenges=int(pending_challenges or 0),
        this_week_submissions=int(this_week_submissions or 0),
        ai_generations_today=int(ai_generations_today or 0),
    )

@router.get("/challenges/{challenge_id}")
async def get_challenge_admin(
    challenge_id: str,
    current_user: User = Depends(require_author),
    db: Session = Depends(get_db)
):
    """Get challenge details for editing (admin access, bypasses schedule restrictions)"""
    
    challenge = db.query(Challenge).filter(Challenge.id == challenge_id).first()
    if not challenge:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Challenge not found"
        )
    
    return {
        "id": str(challenge.id),
        "slug": challenge.slug,
        "title": challenge.title,
        "description": challenge.description,
        "track": challenge.track,
        "difficulty": challenge.difficulty,
        "mode": challenge.mode,
        "status": challenge.status,
        "points_base": challenge.points_base,
        "time_cap_minutes": challenge.time_cap_minutes,
        "flag_type": challenge.flag_type,
        "flag_format": challenge.flag_format,
        "static_flag": challenge.static_flag,
        "created_at": challenge.created_at.isoformat() if challenge.created_at else None,
        "updated_at": challenge.updated_at.isoformat() if challenge.updated_at else None,
        "author_id": str(challenge.author_id)
    }

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
            description=challenge_data.get('description', ''),
            
            # Flag configuration
            flag_type=FlagType(challenge_data.get('flag', {}).get('type', 'dynamic_hmac')),
            flag_format=challenge_data.get('flag', {}).get('format', 'flag{{{}}}'),
            static_flag=challenge_data.get('flag', {}).get('static_value') if challenge_data.get('flag', {}).get('type') == 'static' else None
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
        "slug": challenge.slug,
        "description": challenge.description,
        "status": challenge.status,
        "points_base": challenge.points_base,
        "time_cap_minutes": challenge.time_cap_minutes,
        "track": challenge.track,
        "difficulty": challenge.difficulty,
        "mode": challenge.mode,
        "flag_type": challenge.flag_type,
        "flag_format": challenge.flag_format,
        "static_flag": challenge.static_flag
    }
    
    # Update fields
    if request.title is not None:
        challenge.title = request.title
    if request.slug is not None:
        # Check if slug is unique
        existing = db.query(Challenge).filter(
            Challenge.slug == request.slug,
            Challenge.id != challenge_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Challenge with slug '{request.slug}' already exists"
            )
        challenge.slug = request.slug
    if request.description is not None:
        challenge.description = request.description
    if request.status is not None:
        # Admins can freely change status without transition restrictions
        challenge.status = request.status
    if request.points_base is not None:
        challenge.points_base = request.points_base
    if request.time_cap_minutes is not None:
        challenge.time_cap_minutes = request.time_cap_minutes
    if request.track is not None:
        challenge.track = request.track
    if request.difficulty is not None:
        challenge.difficulty = request.difficulty
    if request.mode is not None:
        challenge.mode = request.mode
    if request.flag_type is not None:
        challenge.flag_type = request.flag_type
    if request.flag_format is not None:
        challenge.flag_format = request.flag_format
    if request.static_flag is not None:
        challenge.static_flag = request.static_flag
    
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

    # Prefetch usernames
    actor_ids = [log.actor_user_id for log in logs if log.actor_user_id]
    users = {}
    if actor_ids:
        for user in db.query(User).filter(User.id.in_(actor_ids)).all():
            users[str(user.id)] = user.username

    def infer_severity(action: str) -> str:
        a = action.lower()
        if "failed" in a or "error" in a:
            return "error"
        if "updated" in a or "delete" in a:
            return "warning"
        return "info"

    responses: List[AuditLogResponse] = []
    for log in logs:
        actor_id_str = str(log.actor_user_id) if log.actor_user_id else None
        actor_username = users.get(actor_id_str) if actor_id_str else None
        ip_address = None
        try:
            if isinstance(log.details_json, dict):
                ip_address = log.details_json.get("ip") or log.details_json.get("ip_address")
        except Exception:
            pass

        responses.append(AuditLogResponse(
            id=str(log.id),
            actor_user_id=actor_id_str,
            actor_username=actor_username,
            action=log.action,
            entity_type=log.entity_type,
            entity_id=log.entity_id,
            details_json=log.details_json,
            created_at=log.created_at,
            ip_address=ip_address,
            severity=infer_severity(log.action),
        ))

    return responses

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
        # Calculate leaderboard snapshot by season window
        user_scores = db.query(
            Submission.user_id,
            func.sum(Submission.points_awarded).label('total_points'),
            func.count(Submission.id.distinct()).filter(Submission.is_correct == True).label('challenges_solved'),
            func.max(Submission.created_at).label('last_submission')
        ).filter(
            Submission.is_correct == True,
            Submission.created_at >= season.start_at,
            Submission.created_at <= season.end_at
        ).group_by(Submission.user_id).order_by(func.sum(Submission.points_awarded).desc()).all()

        participants = []
        for (user_id, total_points, challenges_solved, last_submission) in user_scores:
            user = db.query(User).filter(User.id == user_id).first()
            participants.append({
                "user_id": str(user_id),
                "username": user.username if user else "unknown",
                "total_points": int(total_points or 0),
                "challenges_solved": int(challenges_solved or 0),
                "last_submission": last_submission.isoformat() if last_submission else None
            })

        snapshot_data = {
            "season_id": season_id,
            "generated_at": datetime.utcnow().isoformat(),
            "participants": participants,
            "teams": [],
            "total_participants": len(participants),
            "challenges_completed": sum(p.get('challenges_solved', 0) for p in participants)
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

@router.get("/users", response_model=List[dict])
async def get_users(
    search: Optional[str] = Query(None, description="Search by username or email"),
    role: Optional[str] = Query(None, description="Filter by role"),
    status: Optional[str] = Query(None, description="Filter by active status"),
    limit: int = Query(50, le=200, description="Maximum number of users to return"),
    offset: int = Query(0, description="Offset for pagination"),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get users with filtering and pagination (admin only)"""
    
    query = db.query(User)
    
    # Apply filters
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (User.username.ilike(search_term)) | 
            (User.email.ilike(search_term))
        )
    if role:
        query = query.filter(User.role == role)
    if status == 'active':
        query = query.filter(User.is_active == True)
    elif status == 'inactive':
        query = query.filter(User.is_active == False)
    
    # Order by creation date (newest first)
    query = query.order_by(User.created_at.desc())
    
    # Apply pagination
    users = query.offset(offset).limit(limit).all()
    
    # Get user stats (points, challenges solved, etc.)
    user_responses = []
    for user in users:
        # Calculate user stats
        total_points = db.query(func.sum(Submission.points_awarded)).filter(
            Submission.user_id == user.id,
            Submission.is_correct == True
        ).scalar() or 0
        
        challenges_solved = db.query(func.count(func.distinct(Submission.challenge_id))).filter(
            Submission.user_id == user.id,
            Submission.is_correct == True
        ).scalar() or 0
        
        # Get user rank (simplified)
        user_rank = db.query(func.count()).select_from(
            db.query(Submission.user_id, func.sum(Submission.points_awarded).label('total'))
            .filter(Submission.is_correct == True)
            .group_by(Submission.user_id)
            .having(func.sum(Submission.points_awarded) > total_points)
            .subquery()
        ).scalar() + 1 if total_points > 0 else None

        print("Parsed user:", user.__dict__)
        user_responses.append({
            "id": str(user.id),
            "username": user.username,
            "email": user.email,
            "role": user.role.value,
            # "is_active": user.is_active,
            "created_at": user.created_at,
            "last_login": user.last_login,
            "total_points": int(total_points),
            "challenges_solved": int(challenges_solved),
            "rank": user_rank,
            "totp_enabled": bool(user.totp_secret),
            "email_2fa_enabled": bool(
                db.query(TwoFactorSettings).filter(
                    TwoFactorSettings.user_id == user.id,
                    TwoFactorSettings.email_2fa_enabled == True
                ).first()
            )
        })
    
    return user_responses

@router.patch("/users/{user_id}")
async def update_user(
    user_id: str,
    role: Optional[str] = None,
    is_active: Optional[bool] = None,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Update user (admin only)"""
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Store original values for audit
    original_values = {
        "role": user.role,
        "is_active": user.is_active
    }
    
    # Update fields
    changes = {}
    if role is not None and role != user.role.value:
        from ..models.user import UserRole
        try:
            user.role = UserRole(role)
            changes["role"] = {"from": original_values["role"].value, "to": role}
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid role: {role}"
            )
    
    if is_active is not None and is_active != user.is_active:
        user.is_active = is_active
        changes["is_active"] = {"from": original_values["is_active"], "to": is_active}
    
    user.updated_at = datetime.utcnow()
    
    # Audit log
    if changes:
        audit = AuditLog(
            actor_user_id=current_user.id,
            action="user_updated",
            entity_type="user",
            entity_id=user_id,
            details_json={"changes": changes}
        )
        db.add(audit)
    
    db.commit()
    
    return {
        "user_id": user_id,
        "changes": changes,
        "message": "User updated successfully"
    }

# Status transition validation removed - admins have full control over challenge status
