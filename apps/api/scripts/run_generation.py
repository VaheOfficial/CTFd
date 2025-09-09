import asyncio
import json
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from dotenv import load_dotenv

from src.langchain_agents.orchestrator import GenerationOrchestrator
from src.langchain_agents.config import LangChainConfig
from src.schemas.ai_challenge import GenerateChallengeRequest, ChallengeTrack, ChallengeDifficulty, LLMProvider


async def main():
    # Load environment variables from .env if present
    load_dotenv()
    if not os.getenv("OPENAI_API_KEY"):
        raise RuntimeError("Missing OPENAI_API_KEY. Set it in environment or in a .env file.")
    # Configure
    config = LangChainConfig()
    orchestrator = GenerationOrchestrator(config=config)

    # Build a sample request
    request = GenerateChallengeRequest(
        prompt="Generate an easy forensic challenge. The challenge should involve image analysis, hide the flag inside the image metadata.",
        preferred_provider=LLMProvider.AUTO,
        track=ChallengeTrack.DETECT_FORENSICS,
        difficulty=ChallengeDifficulty.EASY,
        seed=42,
    )

    # Run generation
    response = await orchestrator.generate_challenge(request)

    # Pretty print result
    print(json.dumps({
        "challenge_id": response.challenge_id,
        "generation_id": response.generation_id,
        "provider": response.provider,
        "model": response.model,
        "result": response.generated_json,
    }, indent=2))


if __name__ == "__main__":
    asyncio.run(main())


