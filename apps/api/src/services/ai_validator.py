from typing import Dict, Any, Optional
import structlog
from datetime import datetime

from ..models.challenge import Challenge, ValidationResult, ChallengeStatus
from ..llm_providers.router import llm_router
from sqlalchemy.orm import Session

logger = structlog.get_logger(__name__)

class AIValidator:
    """AI-powered challenge validator service"""

    def __init__(self, db: Session):
        self.db = db

    async def validate_challenge(self, challenge: Challenge, validation_type: str = "initial") -> ValidationResult:
        """
        Validate a challenge using AI
        
        Args:
            challenge: The challenge to validate
            validation_type: Type of validation ("initial" or "post_materialization")
        """
        try:
            # Build validation prompt based on type
            if validation_type == "initial":
                prompt = self._build_initial_validation_prompt(challenge)
            else:
                prompt = self._build_post_materialization_prompt(challenge)

            # Get validation response from LLM
            response = await llm_router.generate_json(
                prompt=prompt,
                schema={
                    "type": "object",
                    "properties": {
                        "score": {"type": "integer", "minimum": 0, "maximum": 100},
                        "status": {"type": "string", "enum": ["passed", "failed"]},
                        "feedback": {"type": "string"},
                        "details": {
                            "type": "object",
                            "properties": {
                                "description_clarity": {"type": "integer", "minimum": 0, "maximum": 100},
                                "solution_completeness": {"type": "integer", "minimum": 0, "maximum": 100},
                                "difficulty_appropriateness": {"type": "integer", "minimum": 0, "maximum": 100},
                                "points_fairness": {"type": "integer", "minimum": 0, "maximum": 100},
                                "artifacts_quality": {"type": "integer", "minimum": 0, "maximum": 100},
                                "improvement_suggestions": {"type": "array", "items": {"type": "string"}}
                            },
                            "required": ["description_clarity", "solution_completeness", 
                                       "difficulty_appropriateness", "points_fairness",
                                       "artifacts_quality", "improvement_suggestions"]
                        }
                    },
                    "required": ["score", "status", "feedback", "details"]
                },
                provider="auto",
                temperature=0.1
            )

            # Create validation result
            validation = ValidationResult(
                challenge_id=challenge.id,
                validation_type=validation_type,
                status=response.parsed_json["status"],
                feedback=response.parsed_json["feedback"],
                score=response.parsed_json["score"],
                details_json=response.parsed_json["details"]
            )
            
            # Update challenge status based on validation result
            if validation_type == "initial":
                if response.parsed_json["status"] == "passed":
                    challenge.status = ChallengeStatus.READY_FOR_MATERIALIZATION
                else:
                    challenge.status = ChallengeStatus.VALIDATION_FAILED
            else:  # post_materialization
                if response.parsed_json["status"] == "passed":
                    challenge.status = ChallengeStatus.READY_FOR_PUBLISHING
                else:
                    challenge.status = ChallengeStatus.VALIDATION_FAILED

            self.db.add(validation)
            self.db.commit()

            logger.info("Challenge validation completed",
                       challenge_id=str(challenge.id),
                       validation_type=validation_type,
                       status=validation.status,
                       score=validation.score)

            return validation

        except Exception as e:
            logger.error("Challenge validation failed",
                        challenge_id=str(challenge.id),
                        validation_type=validation_type,
                        error=str(e))
            raise

    def _build_initial_validation_prompt(self, challenge: Challenge) -> str:
        """Build prompt for initial challenge validation"""
        return f"""You are an expert CTF challenge validator. Please validate the following challenge:

Title: {challenge.title}
Track: {challenge.track}
Difficulty: {challenge.difficulty}
Points: {challenge.points_base}
Time Cap: {challenge.time_cap_minutes} minutes
Mode: {challenge.mode}

Description:
{challenge.description}

Artifacts Plan:
{self._get_artifacts_plan(challenge)}

Please evaluate the challenge based on:
1. Description clarity and completeness
2. Solution guide completeness
3. Appropriateness of difficulty level
4. Fairness of points allocation
5. Quality and relevance of planned artifacts

Provide a detailed assessment with:
- Overall score (0-100)
- Pass/fail status
- Specific feedback
- Detailed scores for each aspect
- Concrete improvement suggestions

Format your response as JSON matching the provided schema."""

    def _build_post_materialization_prompt(self, challenge: Challenge) -> str:
        """Build prompt for post-materialization validation"""
        return f"""You are an expert CTF challenge validator. Please validate this materialized challenge:

Title: {challenge.title}
Track: {challenge.track}
Difficulty: {challenge.difficulty}
Points: {challenge.points_base}
Time Cap: {challenge.time_cap_minutes} minutes
Mode: {challenge.mode}

Description:
{challenge.description}

Materialized Artifacts:
{self._get_materialized_artifacts(challenge)}

Please evaluate the materialized challenge based on:
1. Description clarity and completeness
2. Solution guide completeness
3. Appropriateness of difficulty level
4. Fairness of points allocation
5. Quality and completeness of materialized artifacts

Provide a detailed assessment with:
- Overall score (0-100)
- Pass/fail status
- Specific feedback
- Detailed scores for each aspect
- Concrete improvement suggestions

Format your response as JSON matching the provided schema."""

    def _get_artifacts_plan(self, challenge: Challenge) -> str:
        """Get artifacts plan from generation plan"""
        generation_plan = self.db.query(GenerationPlan).filter(
            GenerationPlan.challenge_id == challenge.id
        ).first()
        
        if generation_plan and generation_plan.artifacts_plan:
            return str(generation_plan.artifacts_plan)
        return "No artifacts plan found"

    def _get_materialized_artifacts(self, challenge: Challenge) -> str:
        """Get list of materialized artifacts"""
        artifacts = []
        for artifact in challenge.artifacts:
            artifacts.append(f"- {artifact.original_filename} ({artifact.kind}, {artifact.size_bytes} bytes)")
        return "\n".join(artifacts) if artifacts else "No materialized artifacts found"
