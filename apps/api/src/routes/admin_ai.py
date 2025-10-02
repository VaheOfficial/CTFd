from fastapi import APIRouter, HTTPException, Depends, status, WebSocket, WebSocketDisconnect, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
import json
import time
import os
import re
import uuid
import asyncio
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
from ..utils.stream import stream_manager

logger = get_logger(__name__)

router = APIRouter()

class GenerateChallengeRequest(BaseModel):
    prompt: str = Field(..., min_length=10, max_length=2000)
    preferred_provider: Optional[str] = Field(None, pattern="^(gpt5|claude|auto)$")
    difficulty: Optional[str] = Field(None, pattern="^(EASY|MEDIUM|HARD|INSANE)$")
    track: Optional[str] = Field(None, pattern="^(INTEL_RECON|ACCESS_EXPLOIT|IDENTITY_CLOUD|C2_EGRESS|DETECT_FORENSICS)$")
    seed: Optional[int] = Field(None, ge=1, le=999999)
    auto_stop: Optional[bool] = Field(False, description="Let AI decide when to stop (infinite iterations mode)")
    max_iterations: Optional[int] = Field(None, ge=1, le=100)
    # Optional client-provided stream ID to allow the UI to subscribe before POST returns
    client_stream_id: Optional[str] = None

class GenerateChallengeResponse(BaseModel):
    challenge_id: str
    generation_id: str
    generated_json: Dict[str, Any]
    provider: str
    model: str
    tokens_used: Optional[int]
    cost_usd: Optional[float]
    stream_id: str

class MaterializeRequest(BaseModel):
    pass  # No additional parameters needed

class PublishRequest(BaseModel):
    season_id: Optional[str] = None
    week_index: Optional[int] = Field(None, ge=1, le=52)

class RetryValidationRequest(BaseModel):
    validation_type: str = Field(..., pattern="^(initial|post_materialization)$")

def rate_limit_ai_generation(max_per_minute: int = 5):
    async def dependency(current_user: User = Depends(require_author)):
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
            # Best-effort; do not block
            pass
        return None
    return dependency

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

@router.post("/generate")
async def generate_challenge(
    request: GenerateChallengeRequest,
    _: None = Depends(rate_limit_ai_generation(max_per_minute = 5)),
    current_user: User = Depends(require_author),
    db: Session = Depends(get_db)
):
    """Generate a challenge using AI with Server-Sent Events streaming"""
    
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

    async def event_stream():
        stream_id = request.client_stream_id or str(uuid.uuid4())
        
        try:
            # Send initial event
            yield f"data: {json.dumps({'type': 'init', 'stream_id': stream_id, 'message': 'Starting generation'})}\n\n"
            
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
            
            yield f"data: {json.dumps({'type': 'plan', 'message': 'Preparing generation request'})}\n\n"
            
            standard_request = StandardRequest(
                prompt=request.prompt,
                preferred_provider=provider_map.get(request.preferred_provider or "auto", LLMProvider.AUTO),
                track=track_map.get(request.track) if request.track else None,
                difficulty=difficulty_map.get(request.difficulty) if request.difficulty else None,
                seed=request.seed,
                auto_stop=request.auto_stop,
                max_iterations=request.max_iterations
            )
            
            # Use the AI generation service
            service = AIGenerationService(db)
            
            yield f"data: {json.dumps({'type': 'build', 'message': 'Starting AI agent'})}\n\n"
            
            # Create a task to run the generation
            generation_task = asyncio.create_task(
                service.generate_challenge(standard_request, current_user, stream_id=stream_id)
            )
            
            # Stream events while generation is running
            response = None
            last_heartbeat = time.time()
            while not generation_task.done():
                # Check for incoming events from stream_manager with a longer timeout
                event = await stream_manager.get_next_incoming(stream_id, timeout_sec=0.5)
                if event:
                    logger.info(f"SSE forwarding event: {event.get('type', 'unknown')}")
                    # Forward the event to SSE
                    yield f"data: {json.dumps(event)}\n\n"
                    # Flush a heartbeat occasionally to encourage streaming in proxies/clients
                    last_heartbeat = time.time()
                
                # Check if task completed
                if generation_task.done():
                    try:
                        response = await generation_task
                        break
                    except Exception as e:
                        raise e
                
                # Small delay to prevent busy waiting if no event
                if not event:
                    await asyncio.sleep(0.1)
                    # Send periodic heartbeat to keep buffers flushing
                    if time.time() - last_heartbeat >= 1.0:
                        yield ": keep-alive\n\n"
                        last_heartbeat = time.time()
            
            # Ensure we get the result
            if response is None:
                response = await generation_task
            
            # Process any remaining events after generation completes
            remaining_events = 0
            while remaining_events < 10:  # Max 10 remaining events to prevent infinite loop
                event = await stream_manager.get_next_incoming(stream_id, timeout_sec=0.1)
                if event:
                    yield f"data: {json.dumps(event)}\n\n"
                    remaining_events += 1
                else:
                    break
            
            yield f"data: {json.dumps({'type': 'verify', 'message': 'Generation completed, verifying'})}\n\n"
            
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
            
            yield f"data: {json.dumps({'type': 'extract', 'message': 'Extracting metadata'})}\n\n"
            yield f"data: {json.dumps({'type': 'materialize', 'message': 'Materializing assets'})}\n\n"
            
            # Send final completion event
            yield f"data: {json.dumps({'type': 'complete', 'challenge_id': response.challenge_id, 'generation_id': response.generation_id, 'provider': response.provider, 'model': response.model, 'tokens_used': response.tokens_used, 'cost_usd': response.cost_usd})}\n\n"
            
        except Exception as e:
            logger.error("AI challenge generation failed", error=str(e))
            db.rollback()
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
    
    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
            "Cache-Status": "no-transform",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Cache-Control"
        }
    )



@router.get("/status/{stream_id}")
async def get_generation_status(
    stream_id: str,
    current_user: User = Depends(require_author)
):
    """Get the current status and events for a generation stream"""
    # This would return events from the stream manager
    # For now, return empty - the frontend will simulate
    return {"stream_id": stream_id, "events": [], "status": "running"}


@router.post("/reply")
async def reply_to_user_request(
    stream_id: str = Form(...),
    request_id: str = Form(...),
    accepted: bool = Form(...),
    reason: Optional[str] = Form(None),
    text: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    current_user: User = Depends(require_author)
):
    """Receive a user response (provide or deny) for an AI user request. Supports optional file upload."""
    try:
        workspace = stream_manager.get_meta(stream_id, 'workspace')
        if not workspace:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unknown stream or workspace not set")

        file_rel_path = None
        if accepted and file is not None:
            # Save file into workspace under user_uploads/<request_id>/
            upload_dir = os.path.join(workspace, 'user_uploads', request_id)
            os.makedirs(upload_dir, exist_ok=True)
            filename = file.filename or 'upload.bin'
            safe_name = filename.replace('..', '_').replace('/', '_')
            dest_path = os.path.join(upload_dir, safe_name)
            with open(dest_path, 'wb') as out:
                out.write(await file.read())
            file_rel_path = os.path.relpath(dest_path, workspace)

        # Push control event for orchestrator to resume
        await stream_manager.submit_control(stream_id, {
            'type': 'user_response',
            'request_id': request_id,
            'accepted': bool(accepted),
            'reason': reason,
            'text': text,
            'file_rel_path': file_rel_path
        })

        # Optionally notify UI that reply was received
        try:
            await stream_manager.publish(stream_id, {
                'type': 'user_response_ack',
                'request_id': request_id,
                'accepted': bool(accepted)
            })
        except Exception:
            pass

        return {
            'ok': True,
            'request_id': request_id,
            'accepted': bool(accepted),
            'file_rel_path': file_rel_path
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Reply handling failed", error=str(e))
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

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
