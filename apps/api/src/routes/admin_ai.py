from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
import json
import os
import re
import uuid
from datetime import datetime

from ..database import get_db
from ..models.user import User
from ..models.challenge import Challenge, ChallengeStatus
from ..models.generation import GenerationPlan, GenerationStatus
from ..services.ai_validator import AIValidator
from ..models.audit import AuditLog
from ..utils.auth import require_author
from ..models.season import Season, Week, WeekChallenge
from ..services.ai_generation import AIGenerationService
from ..utils.logging import get_logger

logger = get_logger(__name__)

router = APIRouter()

class GenerateChallengeRequest(BaseModel):
    prompt: str = Field(..., min_length=10, max_length=2000)
    preferred_provider: Optional[str] = Field(None, pattern="^(gpt5|claude|auto)$")
    difficulty: Optional[str] = Field(None, pattern="^(EASY|MEDIUM|HARD|INSANE)$")
    track: Optional[str] = Field(None, pattern="^(INTEL_RECON|ACCESS_EXPLOIT|IDENTITY_CLOUD|C2_EGRESS|DETECT_FORENSICS)$")
    seed: Optional[int] = Field(None, ge=1, le=999999)

class GenerateChallengeResponse(BaseModel):
    challenge_id: str
    generation_id: str
    generated_json: Dict[str, Any]
    provider: str
    model: str
    tokens_used: Optional[int]
    cost_usd: Optional[float]

class MaterializeRequest(BaseModel):
    pass  # No additional parameters needed

class PublishRequest(BaseModel):
    season_id: Optional[str] = None
    week_index: Optional[int] = Field(None, ge=1, le=52)

class RetryValidationRequest(BaseModel):
    validation_type: str = Field(..., pattern="^(initial|post_materialization)$")

def rate_limit_ai_generation(max_per_minute: int = 5):
    def decorator(func):
        async def wrapper(request: GenerateChallengeRequest, current_user: User, db: Session) -> GenerateChallengeResponse:
            logger.info("Rate limiting check starting")
            try:
                import os
                import redis
                user_id = str(current_user.id)
                r = redis.from_url(os.getenv('REDIS_URL', 'redis://localhost:6379'))
                key = f"ai_rate:{user_id}"
                count = r.incr(key)
                if count == 1:
                    r.expire(key, 60)
                if count > max_per_minute:
                    raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Rate limit exceeded")
                logger.info("Rate limiting check passed")
            except Exception as e:
                logger.warning("Rate limiting check failed", error=str(e))
                pass
            return await func(request, current_user, db)
        return wrapper
    return decorator

def validate_prompt_safety(prompt: str) -> bool:
    """Basic prompt safety validation"""
    
    # Length check
    if len(prompt) < 10 or len(prompt) > 2000:
        return False
    
    # Check for potentially harmful content
    forbidden_patterns = [
        r'\b(?:execute|eval|exec|system|shell|cmd)\b',  # Code execution
        r'\b(?:hack|exploit|attack|breach)\b(?!.*(?:detect|defend|prevent))',  # Malicious intent without defensive context
        r'\b(?:real|actual|live|production)\s+(?:malware|virus|trojan)\b',  # Real malware references
        r'\b(?:ssn|social\s+security|credit\s+card|passport)\b',  # PII patterns
        r'\b\d{3}-\d{2}-\d{4}\b',  # SSN pattern
        r'\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b',  # Credit card pattern
    ]
    
    for pattern in forbidden_patterns:
        if re.search(pattern, prompt, re.IGNORECASE):
            logger.warning("Blocked unsafe prompt", pattern=pattern)
            return False
    
    return True

@router.post("/generate", response_model=GenerateChallengeResponse)
async def generate_challenge(
    request: GenerateChallengeRequest,
    _: None = Depends(rate_limit_ai_generation(max_per_minute = 5)),
    current_user: User = Depends(require_author),
    db: Session = Depends(get_db)
) -> GenerateChallengeResponse:
    logger.info("Entering generate_challenge endpoint")
    """Generate a challenge using AI"""
    logger.info("Generating challenge", 
                prompt=request.prompt,
                provider=request.preferred_provider,
                track=request.track,
                difficulty=request.difficulty,
                seed=request.seed)
    
    # Check if OpenAI API key is configured
    if not os.getenv("OPENAI_API_KEY"):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="OpenAI API key not configured"
        )
    
    # Validate prompt safety
    if not validate_prompt_safety(request.prompt):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Prompt contains potentially unsafe content"
        )
    
    try:
        # Convert admin_ai request to standard format
        from ..schemas.ai_challenge import GenerateChallengeRequest as StandardRequest, LLMProvider, ChallengeTrack, ChallengeDifficulty
        
        # Map string values to enums
        provider_map = {"gpt5": LLMProvider.GPT5, "claude": LLMProvider.CLAUDE, "auto": LLMProvider.AUTO}
        track_map = {
            "INTEL_RECON": ChallengeTrack.INTEL_RECON,
            "ACCESS_EXPLOIT": ChallengeTrack.ACCESS_EXPLOIT,
            "IDENTITY_CLOUD": ChallengeTrack.IDENTITY_CLOUD,
            "C2_EGRESS": ChallengeTrack.C2_EGRESS,
            "DETECT_FORENSICS": ChallengeTrack.DETECT_FORENSICS
        }
        difficulty_map = {
            "EASY": ChallengeDifficulty.EASY,
            "MEDIUM": ChallengeDifficulty.MEDIUM,
            "HARD": ChallengeDifficulty.HARD,
            "INSANE": ChallengeDifficulty.INSANE
        }
        
        standard_request = StandardRequest(
            prompt=request.prompt,
            preferred_provider=provider_map.get(request.preferred_provider or "auto", LLMProvider.AUTO),
            track=track_map.get(request.track) if request.track else None,
            difficulty=difficulty_map.get(request.difficulty) if request.difficulty else None,
            seed=request.seed
        )
        
        # Use the AI generation service
        service = AIGenerationService(db)
        response = await service.generate_challenge(standard_request, current_user)
        
        # Audit log
        audit = AuditLog(
            actor_user_id=current_user.id,
            action="ai_challenge_generated",
            entity_type="challenge",
            entity_id=response.challenge_id,
            details_json={
                "provider": response.provider,
                "model": response.model,
                "tokens": response.tokens_used,
                "cost_usd": response.cost_usd,
                "prompt_preview": request.prompt[:100] + "..." if len(request.prompt) > 100 else request.prompt
            }
        )
        
        db.add(audit)
        db.commit()
        
        logger.info("AI challenge generated successfully",
                   challenge_id=response.challenge_id,
                   provider=response.provider,
                   tokens=response.tokens_used)
        
        return GenerateChallengeResponse(
            challenge_id=response.challenge_id,
            generation_id=response.generation_id,
            generated_json=response.generated_json,
            provider=response.provider,
            model=response.model,
            tokens_used=response.tokens_used,
            cost_usd=response.cost_usd
        )
        
    except Exception as e:
        logger.error("AI challenge generation failed", error=str(e))
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Challenge generation failed: {str(e)}"
        )

@router.post("/materialize/{challenge_id}")
async def materialize_challenge(
    challenge_id: str,
    request: MaterializeRequest,
    current_user: User = Depends(require_author),
    db: Session = Depends(get_db)
):
    """Materialize artifacts for an AI-generated challenge"""
    
    # Get challenge and generation plan
    challenge = db.query(Challenge).filter(Challenge.id == challenge_id).first()
    if not challenge:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Challenge not found"
        )
    
    generation_plan = db.query(GenerationPlan).filter(
        GenerationPlan.challenge_id == challenge_id
    ).first()
    if not generation_plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Generation plan not found"
        )
    
    if generation_plan.status != GenerationStatus.DRAFT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Challenge already materialized (status: {generation_plan.status})"
        )
    
    try:
        # Import here to avoid circular imports
        from ...worker.tasks.materialization import materialize_artifacts
        
        # Enqueue materialization task
        task = materialize_artifacts.delay(
            challenge_id=challenge_id,
            artifacts_plan=generation_plan.artifacts_plan
        )
        
        # Update status
        generation_plan.status = GenerationStatus.MATERIALIZED
        generation_plan.materialized_at = datetime.utcnow()
        
        # Trigger post-materialization validation
        validator = AIValidator(db)
        validation_result = await validator.validate_challenge(challenge, "post_materialization")
        
        # Audit log
        audit = AuditLog(
            actor_user_id=current_user.id,
            action="ai_challenge_materialized",
            entity_type="challenge",
            entity_id=challenge_id,
            details_json={
                "task_id": task.id,
                "artifacts_count": len(generation_plan.artifacts_plan)
            }
        )
        
        db.add(audit)
        db.commit()
        
        return {
            "message": "Materialization started",
            "task_id": task.id,
            "status": "processing"
        }
        
    except Exception as e:
        logger.error("Challenge materialization failed", 
                    challenge_id=challenge_id, 
                    error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Materialization failed: {str(e)}"
        )

@router.post("/publish/{challenge_id}")
async def publish_ai_challenge(
    challenge_id: str,
    request: PublishRequest,
    current_user: User = Depends(require_author),
    db: Session = Depends(get_db)
):
    """Publish an AI-generated challenge"""
    
    # Get challenge and generation plan
    challenge = db.query(Challenge).filter(Challenge.id == challenge_id).first()
    if not challenge:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Challenge not found"
        )
    
    generation_plan = db.query(GenerationPlan).filter(
        GenerationPlan.challenge_id == challenge_id
    ).first()
    
    if generation_plan and generation_plan.status != GenerationStatus.MATERIALIZED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Challenge must be materialized before publishing"
        )
    
    try:
        # Update challenge status
        challenge.status = ChallengeStatus.PUBLISHED
        
        # Update generation plan if exists
        if generation_plan:
            generation_plan.status = GenerationStatus.PUBLISHED
            generation_plan.published_at = datetime.utcnow()
        
        # Schedule to season/week if provided
        if request.season_id and request.week_index:
            week = db.query(Week).filter(Week.season_id == request.season_id, Week.index == request.week_index).first()
            if not week:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Week not found")
            mapping = WeekChallenge(week_id=week.id, challenge_id=challenge_id, display_order=0)
            db.add(mapping)
        
        # Audit log
        audit = AuditLog(
            actor_user_id=current_user.id,
            action="ai_challenge_published",
            entity_type="challenge",
            entity_id=challenge_id,
            details_json={
                "season_id": request.season_id,
                "week_index": request.week_index
            }
        )
        
        db.add(audit)
        db.commit()
        
        # Enqueue notification task (best-effort)
        try:
            from ...worker.tasks.notifications import send_challenge_notification
            send_challenge_notification.delay([], challenge.title, {"index": request.week_index or 0})
        except Exception:
            pass
        
        return {
            "message": "Challenge published successfully",
            "challenge_id": challenge_id,
            "status": "published"
        }
        
    except Exception as e:
        logger.error("Challenge publishing failed", 
                    challenge_id=challenge_id, 
                    error=str(e))
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Publishing failed: {str(e)}"
        )
