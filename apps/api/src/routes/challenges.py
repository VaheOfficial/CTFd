from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
import os
import uuid
import secrets
from datetime import datetime, timedelta

from ..database import get_db
from ..models.user import User, UserRole
from ..models.challenge import Challenge, ChallengeInstance, Artifact, HintConsumption, Hint
from ..models.season import WeekChallenge, Week
from ..models.lab import LabTemplate, LabInstance, LabInstanceStatus
from ..utils.auth import get_current_user
from ..utils.logging import get_logger

logger = get_logger(__name__)

router = APIRouter()



class ChallengeResponse(BaseModel):
    id: str
    slug: str
    title: str
    track: str
    status: str
    difficulty: str
    points_base: int
    time_cap_minutes: int
    mode: str
    description: str
    artifacts: List[dict]
    hints: List[dict]
    has_lab: bool

class ChallengeInstanceResponse(BaseModel):
    id: str
    challenge_id: str
    dynamic_seed: str
    created_at: datetime
    expires_at: Optional[datetime]

class LabStatusResponse(BaseModel):
    instance_id: str
    status: str
    started_at: Optional[datetime]
    expires_at: Optional[datetime]
    kasm_url: Optional[str]
    vpn_config: Optional[str]


@router.get("/challenges", response_model=List[ChallengeResponse])
async def get_challenges(
    track: Optional[str] = None,
    difficulty: Optional[str] = None,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all available challenges with optional filtering"""
    
    # Base query - only show published challenges
    if current_user.role == UserRole.ADMIN:
        query = db.query(Challenge)
    else:
        query = db.query(Challenge).filter(Challenge.status == "PUBLISHED")
    
    # Apply filters
    if track:
        query = query.filter(Challenge.track == track)
    if difficulty:
        query = query.filter(Challenge.difficulty == difficulty)
    
    # Only show challenges that are currently available (within open weeks)
    from sqlalchemy import and_, or_
    now = datetime.utcnow()
    
    # Get challenges that are either not scheduled to any week OR are in an open week
    available_challenge_ids = db.query(WeekChallenge.challenge_id).join(
        Week, WeekChallenge.week_id == Week.id
    ).filter(
        and_(Week.opens_at <= now, Week.closes_at >= now)
    ).subquery()
    
    # Include challenges that are in open weeks OR not scheduled to any week
    challenges = query.filter(
        or_(
            Challenge.id.in_(available_challenge_ids),
            ~Challenge.id.in_(db.query(WeekChallenge.challenge_id))
        )
    ).limit(limit).all()
    
    # Build response
    challenge_responses = []
    for challenge in challenges:
        # Get artifacts
        artifacts = db.query(Artifact).filter(Artifact.challenge_id == challenge.id).all()
        artifacts_data = [
            {
                "id": str(artifact.id),
                "filename": artifact.original_filename,
                "kind": artifact.kind,
                "size_bytes": artifact.size_bytes
            }
            for artifact in artifacts
        ]
        
        # Get hints (without revealing text unless consumed)
        consumed_orders = set(
            hc.hint_order for hc in db.query(HintConsumption).filter(
                HintConsumption.user_id == current_user.id,
                HintConsumption.challenge_id == challenge.id
            ).all()
        )
        hints_data = []
        for hint in challenge.hints:
            item = {
                "order": hint.order,
                "cost_percent": hint.cost_percent,
                "available": hint.order not in consumed_orders
            }
            if hint.order in consumed_orders:
                item["text"] = hint.text
            hints_data.append(item)
        
        # Check if lab available
        has_lab = db.query(LabTemplate).filter(LabTemplate.challenge_id == challenge.id).first() is not None
        
        challenge_responses.append(ChallengeResponse(
            id=str(challenge.id),
            slug=challenge.slug,
            title=challenge.title,
            status=challenge.status,
            track=challenge.track,
            difficulty=challenge.difficulty,
            points_base=challenge.points_base,
            time_cap_minutes=challenge.time_cap_minutes,
            mode=challenge.mode,
            description=challenge.description or "",
            artifacts=artifacts_data,
            hints=hints_data,
            has_lab=has_lab
        ))
    
    return challenge_responses
    

@router.get("/challenges/slug/{slug}", response_model=ChallengeResponse)
async def get_challenge_by_slug(
    slug: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get challenge details by slug"""
    ch = db.query(Challenge).filter(Challenge.slug == slug).first()
    if not ch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Challenge not found")
    return await get_challenge(str(ch.id), current_user, db)

@router.get("/challenges/{challenge_id}", response_model=ChallengeResponse)
async def get_challenge(
    challenge_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get challenge details"""
    
    # Get challenge
    challenge = db.query(Challenge).filter(Challenge.id == challenge_id).first()
    if not challenge:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Challenge not found"
        )
    
    # Enforce schedule access: challenge must be mapped to an open week
    mapping = db.query(WeekChallenge, Week).join(Week, WeekChallenge.week_id == Week.id).filter(
        WeekChallenge.challenge_id == challenge_id
    ).first()
    if mapping:
        _, wk = mapping
        now = datetime.utcnow()
        if not (wk.opens_at <= now <= wk.closes_at):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Challenge not available yet")
    
    # Get artifacts
    artifacts = db.query(Artifact).filter(Artifact.challenge_id == challenge_id).all()
    artifacts_data = [
        {
            "id": str(artifact.id),
            "filename": artifact.original_filename,
            "kind": artifact.kind,
            "size_bytes": artifact.size_bytes
        }
        for artifact in artifacts
    ]
    
    # Get hints (without revealing text)
    # Determine consumed hints
    consumed_orders = set(
        hc.hint_order for hc in db.query(HintConsumption).filter(
            HintConsumption.user_id == current_user.id,
            HintConsumption.challenge_id == challenge_id
        ).all()
    )
    hints_data = []
    for hint in challenge.hints:
        item = {
            "order": hint.order,
            "cost_percent": hint.cost_percent,
            "available": hint.order not in consumed_orders
        }
        if hint.order in consumed_orders:
            item["text"] = hint.text
        hints_data.append(item)
    
    # Check if lab available
    has_lab = db.query(LabTemplate).filter(LabTemplate.challenge_id == challenge_id).first() is not None
    
    return ChallengeResponse(
        id=str(challenge.id),
        slug=challenge.slug,
        title=challenge.title,
        track=challenge.track,
        status=challenge.status,
        difficulty=challenge.difficulty,
        points_base=challenge.points_base,
        time_cap_minutes=challenge.time_cap_minutes,
        mode=challenge.mode,
        description=challenge.description or "",
        artifacts=artifacts_data,
        hints=hints_data,
        has_lab=has_lab
    )

@router.post("/challenges/{challenge_id}/instance", response_model=ChallengeInstanceResponse)
async def create_challenge_instance(
    challenge_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create or get challenge instance (for dynamic flags)"""
    
    # Check if challenge exists
    challenge = db.query(Challenge).filter(Challenge.id == challenge_id).first()
    if not challenge:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Challenge not found"
        )
    
    # Check if instance already exists
    existing_instance = db.query(ChallengeInstance).filter(
        ChallengeInstance.challenge_id == challenge_id,
        ChallengeInstance.user_id == current_user.id
    ).first()
    
    if existing_instance:
        return ChallengeInstanceResponse(
            id=str(existing_instance.id),
            challenge_id=str(existing_instance.challenge_id),
            dynamic_seed=existing_instance.dynamic_seed,
            created_at=existing_instance.created_at,
            expires_at=existing_instance.expires_at
        )
    
    # Create new instance
    instance = ChallengeInstance(
        challenge_id=challenge_id,
        user_id=current_user.id,
        dynamic_seed=secrets.token_hex(16),  # 32-char hex string
        expires_at=datetime.utcnow() + timedelta(hours=24)  # 24-hour expiry
    )
    
    db.add(instance)
    db.commit()
    db.refresh(instance)
    
    logger.info("Challenge instance created",
               challenge_id=challenge_id,
               user_id=str(current_user.id),
               instance_id=str(instance.id))
    
    return ChallengeInstanceResponse(
        id=str(instance.id),
        challenge_id=str(instance.challenge_id),
        dynamic_seed=instance.dynamic_seed,
        created_at=instance.created_at,
        expires_at=instance.expires_at
    )

@router.get("/instances/{instance_id}/lab/status", response_model=LabStatusResponse)
async def get_lab_status(
    instance_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get lab instance status"""
    
    # Get challenge instance
    challenge_instance = db.query(ChallengeInstance).filter(
        ChallengeInstance.id == instance_id,
        ChallengeInstance.user_id == current_user.id
    ).first()
    
    if not challenge_instance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Challenge instance not found"
        )
    
    # Get lab instance
    lab_instance = db.query(LabInstance).filter(
        LabInstance.challenge_instance_id == instance_id
    ).first()
    
    if not lab_instance:
        return LabStatusResponse(
            instance_id=instance_id,
            status="NOT_STARTED",
            started_at=None,
            expires_at=None,
            kasm_url=None,
            vpn_config=None
        )
    
    # Resolve Kasm URL from environment if configured (best-effort)
    kasm_base = os.getenv('KASM_API_URL')
    kasm_url = f"{kasm_base.rstrip('/')}/session/{lab_instance.id}" if kasm_base else None
    vpn_config = None
    
    if lab_instance.status == LabInstanceStatus.RUNNING:
        # Placeholder for real adapter integration
        kasm_url = f"https://kasm.example.com/session/{lab_instance.id}"
        vpn_config = "# WireGuard config would be here"
    
    return LabStatusResponse(
        instance_id=instance_id,
        status=lab_instance.status,
        started_at=lab_instance.started_at,
        expires_at=lab_instance.expires_at,
        kasm_url=kasm_url,
        vpn_config=vpn_config
    )

@router.post("/instances/{instance_id}/lab/start")
async def start_lab_instance(
    instance_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Start lab instance"""
    
    # Get challenge instance
    challenge_instance = db.query(ChallengeInstance).filter(
        ChallengeInstance.id == instance_id,
        ChallengeInstance.user_id == current_user.id
    ).first()
    
    if not challenge_instance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Challenge instance not found"
        )
    
    # Get lab template
    lab_template = db.query(LabTemplate).filter(
        LabTemplate.challenge_id == challenge_instance.challenge_id
    ).first()
    
    if not lab_template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No lab available for this challenge"
        )
    
    # Check if already running
    existing_lab = db.query(LabInstance).filter(
        LabInstance.challenge_instance_id == instance_id,
        LabInstance.status.in_([LabInstanceStatus.STARTING, LabInstanceStatus.RUNNING])
    ).first()
    
    if existing_lab:
        return {
            "message": "Lab already running",
            "instance_id": instance_id,
            "status": existing_lab.status
        }
    
    try:
        # Import and enqueue lab start task
        from ...worker.tasks.labs import start_lab_instance as start_lab_task
        
        # Create lab instance record
        lab_instance = LabInstance(
            lab_template_id=lab_template.id,
            challenge_instance_id=instance_id,
            status=LabInstanceStatus.STARTING,
            expires_at=datetime.utcnow() + timedelta(minutes=lab_template.ttl_minutes)
        )
        
        db.add(lab_instance)
        db.commit()
        db.refresh(lab_instance)
        
        # Enqueue start task
        task = start_lab_task.delay({
            "id": str(lab_template.id),
            "challenge_id": str(challenge_instance.challenge_id),
            "docker_image": lab_template.docker_image,
            "compose_yaml_s3_key": lab_template.compose_yaml_s3_key,
            "ports_json": lab_template.ports_json,
            "env_json": lab_template.env_json,
            "ttl_minutes": lab_template.ttl_minutes
        }, instance_id)
        
        logger.info("Lab start requested",
                   instance_id=instance_id,
                   lab_instance_id=str(lab_instance.id),
                   task_id=task.id)
        
        return {
            "message": "Lab starting",
            "instance_id": instance_id,
            "lab_instance_id": str(lab_instance.id),
            "task_id": task.id,
            "status": "starting"
        }
        
    except Exception as e:
        logger.error("Lab start failed",
                    instance_id=instance_id,
                    error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start lab: {str(e)}"
        )

@router.post("/instances/{instance_id}/lab/stop")
async def stop_lab_instance(
    instance_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Stop lab instance"""
    
    # Get challenge instance
    challenge_instance = db.query(ChallengeInstance).filter(
        ChallengeInstance.id == instance_id,
        ChallengeInstance.user_id == current_user.id
    ).first()
    
    if not challenge_instance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Challenge instance not found"
        )
    
    # Get lab instance
    lab_instance = db.query(LabInstance).filter(
        LabInstance.challenge_instance_id == instance_id,
        LabInstance.status.in_([LabInstanceStatus.STARTING, LabInstanceStatus.RUNNING])
    ).first()
    
    if not lab_instance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No running lab found"
        )
    
    try:
        # Import and enqueue stop task
        from ...worker.tasks.labs import stop_lab_instance as stop_lab_task
        
        # Update status
        lab_instance.status = LabInstanceStatus.STOPPING
        db.commit()
        
        # Enqueue stop task
        task = stop_lab_task.delay(lab_instance.container_id or "")
        
        logger.info("Lab stop requested",
                   instance_id=instance_id,
                   lab_instance_id=str(lab_instance.id),
                   task_id=task.id)
        
        return {
            "message": "Lab stopping",
            "instance_id": instance_id,
            "lab_instance_id": str(lab_instance.id),
            "task_id": task.id,
            "status": "stopping"
        }
        
    except Exception as e:
        logger.error("Lab stop failed",
                    instance_id=instance_id,
                    error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to stop lab: {str(e)}"
        )
