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
from ..agents import ChallengeAgent, AgentConfig
from ..utils.logging import get_logger
from .challenge_materializer import ChallengeMaterializer

logger = get_logger(__name__)

class AIGenerationService:
    def __init__(self, db: Session):
        self.db = db
        self.logger = get_logger(__name__)
        self.config = AgentConfig()
        self.agent = ChallengeAgent(config=self.config)

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
            # Generate challenge using new agent system
            self.logger.info("Starting challenge generation with ChallengeAgent", provider=request.preferred_provider)
            
            # Run the generation pipeline
            result = await self.agent.generate_challenge(request)
            
            # Create challenge record first
            challenge_id = result.challenge_id  # Use the agent's challenge ID
            challenge = Challenge(
                id=challenge_id,
                slug=f"challenge-{challenge_id[:8]}",
                title=result.generated_json.get('title', 'Generated Challenge'),
                track=request.track,
                difficulty=request.difficulty,
                points_base=self._calculate_points(request.difficulty),
                time_cap_minutes=self._calculate_time_cap(request.difficulty),
                mode="standard",
                status=ChallengeStatus.DRAFT,  # Will be updated to PUBLISHED after materialization
                author_id=user.id,
                description=result.generated_json.get('description', '')
            )
            self.db.add(challenge)
            self.db.flush()  # Get the challenge in DB before materialization
            
            # Materialize the challenge into database and storage
            materializer = ChallengeMaterializer(self.db)
            workspace_dir = result.generated_json.get("workspace_dir")
            
            if workspace_dir:
                logger.info(f"Materializing challenge from workspace: {workspace_dir}")
                materialization = await materializer.materialize_challenge(
                    challenge_id, 
                    workspace_dir, 
                    result.generated_json
                )
                logger.info(f"Materialization complete: {materialization}")
                
                # Add materialization info to result
                result.generated_json["materialization"] = materialization

            # Create generation plan
            generation_plan = GenerationPlan(
                challenge_id=challenge.id,
                user_id=user.id,
                prompt=request.prompt,
                provider=result.provider,
                model=result.model,
                seed=request.seed,
                generated_json=result.generated_json,
                artifacts_plan=[],  # Agent creates files directly in workspace
                prompt_tokens=result.tokens_used,
                completion_tokens=None,
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

    def _calculate_points(self, difficulty) -> int:
        """Calculate base points for a challenge based on difficulty."""
        points_map = {
            "EASY": 100,
            "MEDIUM": 250, 
            "HARD": 500,
            "INSANE": 1000
        }
        return points_map.get(str(difficulty), 100)
    
    def _calculate_time_cap(self, difficulty) -> int:
        """Calculate time cap in minutes based on difficulty."""
        time_map = {
            "EASY": 30,
            "MEDIUM": 60,
            "HARD": 120, 
            "INSANE": 240
        }
        return time_map.get(str(difficulty), 30)
