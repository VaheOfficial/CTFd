from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.user import User
from ..utils.auth import require_author
from ..schemas.ai_challenge import GenerateChallengeRequest, GenerateChallengeResponse
from ..services.ai_generation import AIGenerationService
from ..middleware.rate_limit import create_rate_limiter
from ..utils.logging import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/admin/ai", tags=["AI Generation"])

# Rate limit: 5 requests per minute
rate_limit_generation = create_rate_limiter(
    max_requests=5,
    window_seconds=60,
    key_prefix="ai_generation"
)

@router.post(
    "/generate",
    response_model=GenerateChallengeResponse,
    status_code=status.HTTP_201_CREATED,
    description="Generate a new challenge using AI"
)
async def generate_challenge(
    request: GenerateChallengeRequest,
    current_user: User = Depends(require_author),
    db: Session = Depends(get_db)
) -> GenerateChallengeResponse:
    """
    Generate a new challenge using AI.
    
    This endpoint:
    1. Validates the request and user permissions
    2. Applies rate limiting
    3. Generates the challenge using AI
    4. Creates necessary database records
    5. Returns the generated challenge details
    """
    logger.info(
        "AI challenge generation request received",
        user_id=str(current_user.id),
        prompt_length=len(request.prompt)
    )
    
    try:
        # Check rate limit
        await rate_limit_generation(
            lambda: None,
            current_user=current_user
        )()
        
        # Initialize service
        service = AIGenerationService(db)
        
        # Generate challenge
        result = await service.generate_challenge(request, current_user)
        
        logger.info(
            "AI challenge generation completed successfully",
            challenge_id=result.challenge_id,
            generation_id=result.generation_id
        )
        
        return result
        
    except Exception as e:
        logger.error(
            "AI challenge generation failed",
            error=str(e),
            user_id=str(current_user.id)
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
