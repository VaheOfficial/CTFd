#!/usr/bin/env python3
"""
Test script to verify agent-generated challenges can be materialized properly.
"""
import asyncio
import sys
import os
import json
import time
import logging
from pathlib import Path

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

# Configure logging
log_file = f"/tmp/materialization_test_{int(time.time())}.log"
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(log_file)
    ]
)
logger = logging.getLogger(__name__)

from dotenv import load_dotenv
from src.agents import ChallengeAgent, AgentConfig
from src.schemas.ai_challenge import GenerateChallengeRequest, ChallengeTrack, ChallengeDifficulty, LLMProvider


async def main():
    load_dotenv()
    logger.info("Starting materialization test")
    
    if not os.getenv("OPENAI_API_KEY"):
        logger.error("Missing OPENAI_API_KEY")
        raise RuntimeError("Missing OPENAI_API_KEY. Set it in environment or in a .env file.")
    
    # Configure agent
    config = AgentConfig()
    agent = ChallengeAgent(config)
    logger.info(f"Agent initialized with model: {config.model}")

    # Create test request
    request = GenerateChallengeRequest(
        prompt="Create a simple web challenge with a hidden flag in HTML comments",
        preferred_provider=LLMProvider.AUTO,
        track=ChallengeTrack.ACCESS_EXPLOIT,
        difficulty=ChallengeDifficulty.EASY
    )

    # Generate challenge
    logger.info("Starting challenge generation")
    result = await agent.generate_challenge(request)
    logger.info(f"Generation completed - Challenge ID: {result.challenge_id}")

    workspace_dir = result.generated_json.get("workspace_dir")
    if not workspace_dir:
        print("❌ No workspace directory in result")
        return

    workspace_path = Path(workspace_dir)
    if not workspace_path.exists():
        print(f"❌ Workspace directory doesn't exist: {workspace_dir}")
        return

    print(f"\n✅ Challenge generated successfully!")
    print(f"🔍 Workspace: {workspace_dir}")
    
    # List all files created
    print(f"\n📁 Files created:")
    all_files = []
    for file_path in workspace_path.rglob("*"):
        if file_path.is_file():
            rel_path = str(file_path.relative_to(workspace_path))
            size = file_path.stat().st_size
            all_files.append((rel_path, size))
            print(f"  - {rel_path} ({size} bytes)")
    
    # Look for challenge artifacts
    print(f"\n🎯 Challenge artifacts:")
    challenge_artifacts = []
    artifact_patterns = ["challenge/*", "dist/*", "build/*", "artifacts/*"]
    for pattern in artifact_patterns:
        for artifact_path in workspace_path.glob(pattern):
            if artifact_path.is_file():
                rel_path = str(artifact_path.relative_to(workspace_path))
                size = artifact_path.stat().st_size
                challenge_artifacts.append((rel_path, size))
                print(f"  ✓ {rel_path} ({size} bytes)")
    
    if not challenge_artifacts:
        print("  ⚠️  No challenge artifacts found!")
    
    # Look for flag
    print(f"\n🏁 Flag detection:")
    flag_found = None
    
    # Check flag.txt
    flag_file = workspace_path / "flag.txt"
    if flag_file.exists():
        flag_content = flag_file.read_text().strip()
        print(f"  ✓ flag.txt: {flag_content}")
        flag_found = flag_content
    
    # Check in files for CTF{...} pattern
    import re
    for file_path in workspace_path.rglob("*.py"):
        try:
            content = file_path.read_text()
            matches = re.findall(r'CTF\{[^}]+\}', content)
            if matches:
                rel_path = str(file_path.relative_to(workspace_path))
                print(f"  ✓ Found in {rel_path}: {matches}")
                if not flag_found:
                    flag_found = matches[0]
        except:
            pass
    
    if not flag_found:
        print("  ⚠️  No flag found!")
    
    # Test if we can build the challenge
    print(f"\n🔨 Build test:")
    if (workspace_path / "Makefile").exists():
        print("  ✓ Makefile found")
        # Could test make build here if needed
    elif (workspace_path / "requirements.txt").exists():
        print("  ✓ requirements.txt found")
    
    # Summary
    print(f"\n📊 Summary:")
    print(f"  - Total files: {len(all_files)}")
    print(f"  - Challenge artifacts: {len(challenge_artifacts)}")
    print(f"  - Flag found: {'✓' if flag_found else '❌'}")
    print(f"  - Build system: {'✓' if (workspace_path / 'Makefile').exists() else '❌'}")
    
    print(f"\n📄 Full logs: {log_file}")
    
    # Save detailed results
    test_results = {
        "challenge_id": result.challenge_id,
        "workspace_dir": workspace_dir,
        "files_created": [{"path": path, "size": size} for path, size in all_files],
        "challenge_artifacts": [{"path": path, "size": size} for path, size in challenge_artifacts],
        "flag_found": flag_found,
        "has_makefile": (workspace_path / "Makefile").exists(),
        "has_requirements": (workspace_path / "requirements.txt").exists(),
    }
    
    results_file = f"/tmp/materialization_results_{int(time.time())}.json"
    with open(results_file, 'w') as f:
        json.dump(test_results, f, indent=2)
    
    print(f"📋 Test results: {results_file}")


if __name__ == "__main__":
    asyncio.run(main())
