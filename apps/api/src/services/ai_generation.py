from typing import Optional, Dict, Any
import uuid
from datetime import datetime
import json
import os
from sqlalchemy.orm import Session

from ..models.challenge import Challenge, ChallengeStatus, ChallengeMode
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
try:
    from ..utils.stream import stream_manager
except Exception:
    stream_manager = None

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
        user: User,
        stream_id: str | None = None
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
            result = await self.agent.generate_challenge(request, stream_id=stream_id)
            
            # Create challenge record first
            challenge_id = result.challenge_id  # Use the agent's challenge ID
            # Title/description should come from AI outputs if present; avoid placeholder
            ai_title = result.generated_json.get('title')
            ai_description = result.generated_json.get('description')
            challenge = Challenge(
                id=challenge_id,
                slug=f"challenge-{challenge_id[:8]}",
                title=(ai_title.strip() if isinstance(ai_title, str) and ai_title.strip() else 'Generated Challenge'),
                track=request.track,
                difficulty=request.difficulty,
                points_base=self._calculate_points(request.difficulty),
                time_cap_minutes=self._calculate_time_cap(request.difficulty),
                mode=ChallengeMode.SOLO,
                status=ChallengeStatus.DRAFT,  # Will be updated to READY after materialization (admin must manually publish)
                author_id=user.id,
                description=(ai_description.strip() if isinstance(ai_description, str) else '')
            )
            self.db.add(challenge)
            self.db.flush()  # Get the challenge in DB before materialization
            
            # Materialize the challenge into database and storage
            materializer = ChallengeMaterializer(self.db)
            workspace_dir = result.generated_json.get("workspace_dir")
            
            if workspace_dir:
                logger.info(f"Materializing challenge from workspace: {workspace_dir}")
                if stream_manager and stream_id:
                    try:
                        await stream_manager.publish(stream_id, {
                            "type": "materialize_start",
                            "challenge_id": challenge_id,
                            "workspace": workspace_dir
                        })
                    except Exception:
                        pass
                materialization = await materializer.materialize_challenge(
                    challenge_id, 
                    workspace_dir, 
                    result.generated_json
                )
                logger.info(f"Materialization complete: {materialization}")
                if stream_manager and stream_id:
                    try:
                        await stream_manager.publish(stream_id, {
                            "type": "materialize_complete",
                            "challenge_id": challenge_id,
                            "artifacts": len(materialization.get('artifacts_created', [])),
                            "hints": len(materialization.get('hints_created', [])),
                            "flag_configured": materialization.get('flag_configured', False)
                        })
                    except Exception:
                        pass
                
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

            # If materialized, update plan status and trace before saving
            if result.generated_json.get("materialization"):
                generation_plan.status = GenerationStatus.MATERIALIZED
                from datetime import datetime
                generation_plan.materialized_at = datetime.utcnow()
                generation_plan.materialization_trace = result.generated_json.get("materialization")

            # Save to database
            self.db.add(challenge)
            self.db.add(generation_plan)
            self.db.commit()

            self.logger.info(
                "Challenge generation completed",
                challenge_id=str(challenge.id),
                generation_id=str(generation_plan.id)
            )
            if stream_manager and stream_id:
                try:
                    await stream_manager.publish(stream_id, {
                        "type": "service_complete",
                        "challenge_id": str(challenge.id),
                        "generation_id": str(generation_plan.id)
                    })
                except Exception:
                    pass

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
