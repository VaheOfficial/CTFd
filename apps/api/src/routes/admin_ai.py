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
from ..models.audit import AuditLog
from ..utils.auth import require_author
from ..llm_providers.router import llm_router
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

# Rate limiting decorator (placeholder - implement with Redis)
def rate_limit_ai_generation(max_per_minute: int = 5):
    def decorator(func):
        async def wrapper(*args, **kwargs):
            # TODO: Implement Redis-based rate limiting
            # For now, just pass through
            return await func(*args, **kwargs)
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

@router.post("/generate-challenge", response_model=GenerateChallengeResponse)
@rate_limit_ai_generation(max_per_minute=5)
async def generate_challenge(
    request: GenerateChallengeRequest,
    current_user: User = Depends(require_author),
    db: Session = Depends(get_db)
):
    """Generate a challenge using AI"""
    
    # Check if LLM is configured
    if not llm_router.is_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI challenge generation not configured"
        )
    
    # Validate prompt safety
    if not validate_prompt_safety(request.prompt):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Prompt contains potentially unsafe content"
        )
    
    try:
        # Load challenge generation template
        template_path = os.path.join(os.path.dirname(__file__), '..', 'ai_templates', 'challenge_gen.md')
        with open(template_path, 'r') as f:
            template = f.read()
        
        # Load JSON schema
        schema_path = os.path.join(os.path.dirname(__file__), '..', '..', '..', '..', 'packages', 'shared', 'src', 'schemas', 'challenge_gen.schema.json')
        with open(schema_path, 'r') as f:
            schema = json.load(f)
        
        # Build composite prompt
        composite_prompt = template + "\n\n" + request.prompt
        
        # Add constraints if specified
        if request.difficulty:
            composite_prompt += f"\n\nRequired difficulty: {request.difficulty}"
        if request.track:
            composite_prompt += f"\nRequired track: {request.track}"
        if request.seed:
            composite_prompt += f"\nUse seed: {request.seed} for deterministic generation"
        
        # Generate with LLM
        provider = request.preferred_provider or "auto"
        response = await llm_router.generate_json(
            prompt=composite_prompt,
            schema=schema,
            provider=provider,
            temperature=0.1,
            max_tokens=4000
        )
        
        # Create challenge record
        challenge_id = str(uuid.uuid4())
        challenge = Challenge(
            id=challenge_id,
            slug=response.parsed_json['id'],
            title=response.parsed_json['title'],
            track=response.parsed_json['track'],
            difficulty=response.parsed_json['difficulty'],
            points_base=response.parsed_json['points'],
            time_cap_minutes=response.parsed_json['time_cap_minutes'],
            mode=response.parsed_json['mode'],
            status=ChallengeStatus.DRAFT,
            author_id=current_user.id,
            description=response.parsed_json.get('description', '')
        )
        
        db.add(challenge)
        db.flush()  # Get challenge ID
        
        # Create generation plan
        generation_plan = GenerationPlan(
            challenge_id=challenge.id,
            user_id=current_user.id,
            prompt=request.prompt,
            provider=response.provider,
            model=response.model,
            seed=request.seed,
            generated_json=response.parsed_json,
            artifacts_plan=response.parsed_json['artifacts_plan'],
            prompt_tokens=response.usage.prompt_tokens if response.usage else None,
            completion_tokens=response.usage.completion_tokens if response.usage else None,
            total_tokens=response.usage.total_tokens if response.usage else None,
            cost_usd=response.usage.cost_usd if response.usage else None,
            status=GenerationStatus.DRAFT
        )
        
        db.add(generation_plan)
        
        # Audit log
        audit = AuditLog(
            actor_user_id=current_user.id,
            action="ai_challenge_generated",
            entity_type="challenge",
            entity_id=str(challenge.id),
            details_json={
                "provider": response.provider,
                "model": response.model,
                "tokens": response.usage.total_tokens if response.usage else None,
                "cost_usd": response.usage.cost_usd if response.usage else None,
                "prompt_preview": request.prompt[:100] + "..." if len(request.prompt) > 100 else request.prompt
            }
        )
        
        db.add(audit)
        db.commit()
        
        logger.info("AI challenge generated successfully",
                   challenge_id=str(challenge.id),
                   provider=response.provider,
                   tokens=response.usage.total_tokens if response.usage else None)
        
        return GenerateChallengeResponse(
            challenge_id=str(challenge.id),
            generation_id=str(generation_plan.id),
            generated_json=response.parsed_json,
            provider=response.provider,
            model=response.model,
            tokens_used=response.usage.total_tokens if response.usage else None,
            cost_usd=response.usage.cost_usd if response.usage else None
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
        
        # TODO: Schedule to season/week if provided
        if request.season_id and request.week_index:
            # Implementation would add challenge to specific week
            pass
        
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
        
        # TODO: Enqueue notification task
        
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
