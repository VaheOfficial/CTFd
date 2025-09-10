import asyncio
import json
import sys
import os
import logging
import time
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from dotenv import load_dotenv

# Configure logging to both console and file
log_file = f"/tmp/challenge_generation_{int(time.time())}.log"
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(log_file)
    ]
)
logger = logging.getLogger(__name__)

from src.agents import ChallengeAgent, AgentConfig
from src.schemas.ai_challenge import GenerateChallengeRequest, ChallengeTrack, ChallengeDifficulty, LLMProvider
from src.services.challenge_materializer import ChallengeMaterializer


async def main():
    # Load environment variables from .env if present
    load_dotenv()
    logger.info("Starting challenge generation script")
    
    if not os.getenv("OPENAI_API_KEY"):
        logger.error("Missing OPENAI_API_KEY")
        raise RuntimeError("Missing OPENAI_API_KEY. Set it in environment or in a .env file.")
    
    # Configure new agent
    logger.info("Initializing agent configuration")
    config = AgentConfig()
    agent = ChallengeAgent(config)
    logger.info(f"Agent initialized with model: {config.model}, max_iterations: {config.max_iterations}")

    # Build a sample request
    request = GenerateChallengeRequest(
        prompt="Generate an easy forensic challenge. The challenge should involve image analysis, hide the flag inside the image metadata.",
        preferred_provider=LLMProvider.AUTO,
        track=ChallengeTrack.DETECT_FORENSICS,
        difficulty=ChallengeDifficulty.EASY
    )

    # Run generation
    logger.info("Starting challenge generation")
    response = await agent.generate_challenge(request)
    logger.info(f"Generation completed - Challenge ID: {response.challenge_id}")

    # Pretty print result
    out = {
        "challenge_id": response.challenge_id,
        "generation_id": response.generation_id,
        "provider": response.provider,
        "model": response.model,
        "result": response.generated_json,
    }
    
    logger.info("Printing results")
    print(json.dumps(out, indent=2))
    
    # Also save results to file
    results_file = f"/tmp/challenge_results_{int(time.time())}.json"
    with open(results_file, 'w') as f:
        json.dump(out, f, indent=2)
    
    logger.info(f"Results saved to: {results_file}")
    logger.info(f"Logs saved to: {log_file}")
    logger.info("Challenge generation script completed successfully")
    
    # Print workspace location for inspection
    workspace_dir = out["result"].get("workspace_dir")
    if workspace_dir:
        logger.info(f"Challenge workspace: {workspace_dir}")
        print(f"\n🔍 Inspect challenge files at: {workspace_dir}")
        print(f"📄 Full logs: {log_file}")
        print(f"📋 Results JSON: {results_file}")
        
        # List what files were actually created
        import os
        if os.path.exists(workspace_dir):
            print(f"\n📁 Files created in workspace:")
            for root, dirs, files in os.walk(workspace_dir):
                for file in files:
                    rel_path = os.path.relpath(os.path.join(root, file), workspace_dir)
                    file_size = os.path.getsize(os.path.join(root, file))
                    print(f"  - {rel_path} ({file_size} bytes)")
        
        # Check for challenge artifacts specifically
        challenge_dir = os.path.join(workspace_dir, "challenge")
        if os.path.exists(challenge_dir):
            print(f"\n🎯 Challenge artifacts:")
            for file in os.listdir(challenge_dir):
                file_path = os.path.join(challenge_dir, file)
                if os.path.isfile(file_path):
                    file_size = os.path.getsize(file_path)
                    print(f"  - challenge/{file} ({file_size} bytes)")
        else:
            print(f"\n⚠️  No challenge/ directory found!")
            
        # Show materialization results if available
        materialization = out["result"].get("materialization")
        if materialization:
            print(f"\n📦 Materialization results:")
            print(f"  - Artifacts: {len(materialization.get('artifacts_created', []))}")
            print(f"  - Hints: {len(materialization.get('hints_created', []))}")
            print(f"  - Flag configured: {materialization.get('flag_configured', False)}")
            if materialization.get("errors"):
                print(f"  - Errors: {materialization['errors']}")


if __name__ == "__main__":
    asyncio.run(main())


