from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import hmac
from datetime import datetime, timedelta

from ..database import get_db
from ..models.user import User
from ..models.challenge import Challenge, ChallengeInstance, Hint, ValidatorConfig, HintConsumption
from ..models.season import WeekChallenge, Week
from ..models.submission import Submission
from ..utils.auth import get_current_user
from ..utils.flags import verify_hmac_flag, verify_static_flag
from ..utils.logging import get_logger

logger = get_logger(__name__)

router = APIRouter()

class SubmitFlagRequest(BaseModel):
    flag: str

class SubmitFlagResponse(BaseModel):
    correct: bool
    points_awarded: int
    is_first_blood: bool
    message: str

class ConsumeHintResponse(BaseModel):
    hint_text: str
    cost_percent: int
    points_deducted: int
    remaining_points: int

# Rate limiting storage (in production, use Redis)
_submission_rate_limit = {}  # {user_id: {challenge_id: [timestamps]}}
_hint_rate_limit = {}

def check_submission_rate_limit(user_id: str, challenge_id: str) -> bool:
    """Check if user can submit (1 per 10 seconds per challenge)"""
    now = datetime.utcnow()
    user_limits = _submission_rate_limit.setdefault(user_id, {})
    challenge_submissions = user_limits.setdefault(challenge_id, [])
    
    # Remove old timestamps
    challenge_submissions[:] = [ts for ts in challenge_submissions if now - ts < timedelta(seconds=10)]
    
    if challenge_submissions:
        return False  # Rate limited
    
    challenge_submissions.append(now)
    return True

def check_bad_submission_limit(user_id: str, challenge_id: str, db: Session) -> bool:
    """Check if user has exceeded bad submission limit (10 bad per minute)"""
    one_minute_ago = datetime.utcnow() - timedelta(minutes=1)
    
    bad_submissions = db.query(Submission).filter(
        Submission.user_id == user_id,
        Submission.challenge_id == challenge_id,
        Submission.is_correct == False,
        Submission.created_at >= one_minute_ago
    ).count()
    
    return bad_submissions < 10

@router.post("/challenges/{challenge_id}/submit", response_model=SubmitFlagResponse)
async def submit_flag(
    challenge_id: str,
    request: SubmitFlagRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Submit a flag for a challenge"""
    
    # Get challenge
    challenge = db.query(Challenge).filter(Challenge.id == challenge_id).first()
    # Enforce schedule access: mapped to open week
    mapping = db.query(WeekChallenge, Week).join(Week, WeekChallenge.week_id == Week.id).filter(
        WeekChallenge.challenge_id == challenge_id
    ).first()
    if mapping:
        _, wk = mapping
        now = datetime.utcnow()
        if not (wk.opens_at <= now <= wk.closes_at):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Challenge not available")
    if not challenge:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Challenge not found"
        )
    
    # Rate limiting
    if not check_submission_rate_limit(str(current_user.id), challenge_id):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limited: 1 submission per 10 seconds per challenge"
        )
    
    if not check_bad_submission_limit(str(current_user.id), challenge_id, db):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many incorrect submissions. Try again later."
        )
    
    # Check if already solved
    existing_correct = db.query(Submission).filter(
        Submission.challenge_id == challenge_id,
        Submission.user_id == current_user.id,
        Submission.is_correct == True
    ).first()
    
    if existing_correct:
        return SubmitFlagResponse(
            correct=False,
            points_awarded=0,
            is_first_blood=False,
            message="Challenge already solved"
        )
    
    # Get challenge instance for dynamic flags
    challenge_instance = None
    if challenge.mode == "solo":  # Dynamic flags for solo challenges
        challenge_instance = db.query(ChallengeInstance).filter(
            ChallengeInstance.challenge_id == challenge_id,
            ChallengeInstance.user_id == current_user.id
        ).first()
    
    # Validate flag
    is_correct = False
    validation_details = ""
    
    try:
        # Check flag type from challenge metadata (stored in description or separate field)
        # For now, assume dynamic_hmac by default
        if challenge_instance:
            # Dynamic HMAC flag
            is_correct = verify_hmac_flag(
                submitted_flag=request.flag,
                user_id=str(current_user.id),
                challenge_id=challenge_id,
                dynamic_seed=challenge_instance.dynamic_seed
            )
            validation_details = "HMAC validation"
        else:
            # Check for validator
            validator = db.query(ValidatorConfig).filter(
                ValidatorConfig.challenge_id == challenge_id
            ).first()
            
            if validator and validator.type == "container":
                # Enqueue validator task
                from ...worker.tasks.validators import run_validator_container
                
                task = run_validator_container.delay(
                    validator_config={
                        "type": validator.type,
                        "image": validator.image,
                        "command": validator.command,
                        "timeout_sec": validator.timeout_sec,
                        "network_policy": validator.network_policy
                    },
                    submission_data={
                        "flag": request.flag,
                        "user_id": str(current_user.id),
                        "challenge_id": challenge_id,
                        "dynamic_seed": challenge_instance.dynamic_seed if challenge_instance else ""
                    }
                )
                
                # For async validation, return pending status
                # In production, this would poll the task result
                validator_result = {"ok": False, "details": "Validator task enqueued"}
                
                is_correct = validator_result.get("ok", False)
                validation_details = validator_result.get("details", "Validator check")
            else:
                # Static flag (fallback)
                # This would need the expected flag stored somewhere
                is_correct = False  # Placeholder
                validation_details = "Static flag check"
    
    except Exception as e:
        logger.error("Flag validation failed", 
                    challenge_id=challenge_id,
                    user_id=str(current_user.id),
                    error=str(e))
        validation_details = f"Validation error: {str(e)}"
    
    # Calculate points
    points_awarded = 0
    is_first_blood = False
    
    if is_correct:
        # Check for first blood
        first_solver = db.query(Submission).filter(
            Submission.challenge_id == challenge_id,
            Submission.is_correct == True
        ).first()
        
        is_first_blood = first_solver is None
        
        # Calculate points with hint deductions
        base_points = challenge.points_base
        
        # Get consumed hints for this user/challenge
        consumptions = db.query(HintConsumption).filter(
            HintConsumption.user_id == current_user.id,
            HintConsumption.challenge_id == challenge_id
        ).all()
        hint_deduction = sum(int(challenge.points_base * (db.query(Hint).filter(
            Hint.challenge_id == challenge_id, Hint.order == hc.hint_order
        ).first().cost_percent / 100)) for hc in consumptions if db.query(Hint).filter(
            Hint.challenge_id == challenge_id, Hint.order == hc.hint_order
        ).first() is not None)
        
        points_awarded = max(0, base_points - hint_deduction)
    
    # Create submission record
    submission = Submission(
        challenge_id=challenge_id,
        user_id=current_user.id,
        submitted_flag=request.flag[:100],  # Truncate for storage
        is_correct=is_correct,
        points_awarded=points_awarded,
        is_first_blood=is_first_blood
    )
    
    db.add(submission)
    db.commit()
    
    # Log result
    logger.info("Flag submission processed",
               challenge_id=challenge_id,
               user_id=str(current_user.id),
               correct=is_correct,
               points=points_awarded,
               first_blood=is_first_blood)
    
    # Determine response message
    if is_correct:
        if is_first_blood:
            message = "🩸 First Blood! Correct flag submitted."
        else:
            message = "✅ Correct flag submitted."
    else:
        message = "❌ Incorrect flag. Try again."
    
    return SubmitFlagResponse(
        correct=is_correct,
        points_awarded=points_awarded,
        is_first_blood=is_first_blood,
        message=message
    )

@router.post("/challenges/{challenge_id}/hint/{hint_order}/consume", response_model=ConsumeHintResponse)
async def consume_hint(
    challenge_id: str,
    hint_order: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Consume a hint and deduct points"""
    
    # Get challenge
    challenge = db.query(Challenge).filter(Challenge.id == challenge_id).first()
    if not challenge:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Challenge not found"
        )
    
    # Check if already solved
    existing_correct = db.query(Submission).filter(
        Submission.challenge_id == challenge_id,
        Submission.user_id == current_user.id,
        Submission.is_correct == True
    ).first()
    
    if existing_correct:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot consume hints for already solved challenge"
        )
    
    # Get hint
    hint = db.query(Hint).filter(
        Hint.challenge_id == challenge_id,
        Hint.order == hint_order
    ).first()
    
    if not hint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hint not found"
        )
    
    # Idempotency: prevent duplicate consumption
    existing = db.query(HintConsumption).filter(
        HintConsumption.user_id == current_user.id,
        HintConsumption.challenge_id == challenge_id,
        HintConsumption.hint_order == hint_order
    ).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Hint already consumed")
    
    # Calculate point deduction
    base_points = challenge.points_base
    points_deducted = int(base_points * (hint.cost_percent / 100))
    remaining_points = base_points - points_deducted
    
    # Store hint consumption
    consumption = HintConsumption(
        user_id=current_user.id,
        challenge_id=challenge_id,
        hint_order=hint_order
    )
    db.add(consumption)
    db.commit()
    
    logger.info("Hint consumed",
               challenge_id=challenge_id,
               user_id=str(current_user.id),
               hint_order=hint_order,
               points_deducted=points_deducted)
    
    return ConsumeHintResponse(
        hint_text=hint.text,
        cost_percent=hint.cost_percent,
        points_deducted=points_deducted,
        remaining_points=remaining_points
    )
