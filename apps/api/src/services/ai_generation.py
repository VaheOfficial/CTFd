from typing import Optional, Dict, Any
import uuid
from datetime import datetime
import json
import os
from sqlalchemy.orm import Session

from ..models.challenge import Challenge, ChallengeStatus
from ..models.generation import GenerationPlan, GenerationStatus
from ..models.user import User
from ..schemas.ai_challenge import (
    GenerateChallengeRequest,
    GenerateChallengeResponse,
    GeneratedChallenge,
    LLMProvider
)
from ..langchain_agents.orchestrator import GenerationOrchestrator
from ..langchain_agents.config import LangChainConfig
from ..utils.logging import get_logger

logger = get_logger(__name__)

class AIGenerationService:
    def __init__(self, db: Session):
        self.db = db
        self.logger = get_logger(__name__)
        self.config = LangChainConfig()
        self.orchestrator = GenerationOrchestrator(config=self.config)

    async def generate_challenge(
        self,
        request: GenerateChallengeRequest,
        user: User
    ) -> GenerateChallengeResponse:
        """
        Generate a new challenge using AI
        """
        self.logger.info(
            "Starting challenge generation",
            user_id=str(user.id),
            prompt_length=len(request.prompt),
            provider=request.preferred_provider,
            track=request.track,
            difficulty=request.difficulty
        )

        try:
            # Generate challenge using LangChain orchestrator
            self.logger.info("Starting challenge generation with LangChain", provider=request.preferred_provider)
            
            # Run the generation pipeline
            result = await self.orchestrator.generate_challenge(request)
            
            # Create challenge record
            challenge_id = str(uuid.uuid4())
            challenge = Challenge(
                id=challenge_id,
                slug=result.generated_json['id'],
                title=result.generated_json['title'],
                track=result.generated_json['track'],
                difficulty=result.generated_json['difficulty'],
                points_base=result.generated_json['points'],
                time_cap_minutes=result.generated_json['time_cap_minutes'],
                mode=result.generated_json['mode'],
                status=ChallengeStatus.VALIDATION_PENDING,
                author_id=user.id,
                description=result.generated_json.get('description', '')
            )

            # Create generation plan
            generation_plan = GenerationPlan(
                challenge_id=challenge.id,
                user_id=user.id,
                prompt=request.prompt,
                provider=result.provider,
                model=result.model,
                seed=request.seed,
                generated_json=result.generated_json,
                artifacts_plan=result.generated_json.get('artifacts_plan', []),
                prompt_tokens=result.tokens_used,  # We'll need to track these in the orchestrator
                completion_tokens=None,  # We'll need to track these in the orchestrator
                total_tokens=result.tokens_used,
                cost_usd=result.cost_usd,
                status=GenerationStatus.DRAFT
            )

            # Save to database
            self.db.add(challenge)
            self.db.add(generation_plan)
            self.db.commit()

            self.logger.info(
                "Challenge generation completed",
                challenge_id=str(challenge.id),
                generation_id=str(generation_plan.id)
            )

            return GenerateChallengeResponse(
                challenge_id=str(challenge.id),
                generation_id=str(generation_plan.id),
                generated_json=result.generated_json,
                provider=result.provider,
                model=result.model,
                tokens_used=result.tokens_used,
                cost_usd=result.cost_usd
            )

        except Exception as e:
            self.logger.error(
                "Challenge generation failed",
                error=str(e),
                user_id=str(user.id)
            )
            self.db.rollback()
            raise
