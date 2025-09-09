from pydantic import BaseModel, Field, validator
from typing import Optional, Dict, Any, List
from enum import Enum

class ChallengeTrack(str, Enum):
    INTEL_RECON = "INTEL_RECON"
    ACCESS_EXPLOIT = "ACCESS_EXPLOIT"
    IDENTITY_CLOUD = "IDENTITY_CLOUD"
    C2_EGRESS = "C2_EGRESS"
    DETECT_FORENSICS = "DETECT_FORENSICS"

class ChallengeDifficulty(str, Enum):
    EASY = "EASY"
    MEDIUM = "MEDIUM"
    HARD = "HARD"
    INSANE = "INSANE"

class LLMProvider(str, Enum):
    GPT5 = "gpt5"
    CLAUDE = "claude"
    AUTO = "auto"

class GenerateChallengeRequest(BaseModel):
    prompt: str = Field(
        ...,
        min_length=10,
        max_length=2000,
        description="The prompt describing the challenge to generate"
    )
    preferred_provider: Optional[LLMProvider] = Field(
        default=LLMProvider.AUTO,
        description="Preferred LLM provider for generation"
    )
    track: Optional[ChallengeTrack] = Field(
        default=None,
        description="The challenge track/category"
    )
    difficulty: Optional[ChallengeDifficulty] = Field(
        default=None,
        description="The desired difficulty level"
    )
    seed: Optional[int] = Field(
        default=None,
        ge=1,
        le=999999,
        description="Seed for deterministic generation"
    )

    @validator('prompt')
    def validate_prompt_safety(cls, v):
        # Basic safety checks
        forbidden_terms = [
            'exec(',
            'eval(',
            'system(',
            'shell',
            'sudo',
            'rm -rf',
        ]
        for term in forbidden_terms:
            if term.lower() in v.lower():
                raise ValueError(f"Prompt contains forbidden term: {term}")
        return v

class ArtifactPlan(BaseModel):
    type: str
    name: str
    content_type: str
    size_estimate: int
    metadata: Dict[str, Any] = {}

class GeneratedChallenge(BaseModel):
    id: str
    title: str
    description: str
    difficulty: ChallengeDifficulty
    track: ChallengeTrack
    points: int
    time_cap_minutes: int
    mode: str
    artifacts_plan: List[ArtifactPlan]

class GenerateChallengeResponse(BaseModel):
    challenge_id: str
    generation_id: str
    generated_json: Dict[str, Any]
    provider: str
    model: str
    tokens_used: Optional[int] = None
    cost_usd: Optional[float] = None
