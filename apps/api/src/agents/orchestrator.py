"""
OpenAI agent-based orchestrator for CTF challenge generation.
"""
import json
import os
from typing import Dict, Any, List, Optional
from uuid import uuid4
from pathlib import Path
import logging

import openai
from openai import OpenAI

from .config import AgentConfig
from .tools import ToolRegistry
from ..schemas.ai_challenge import (
    GenerateChallengeRequest, 
    GenerateChallengeResponse
)

logger = logging.getLogger(__name__)


class ChallengeAgent:
    """OpenAI agent for CTF challenge generation with tool calling."""
    
    def __init__(self, config: AgentConfig):
        self.config = config
        self.client = OpenAI(
            api_key=config.api_key,
            base_url=config.base_url
        )
        self.tools = ToolRegistry(config)
        
        # Ensure workspace exists
        Path(config.workspace_root).mkdir(parents=True, exist_ok=True)
    
    async def generate_challenge(self, request: GenerateChallengeRequest) -> GenerateChallengeResponse:
        """Generate a complete CTF challenge using the agent."""
        
        # Create unique workspace for this generation
        generation_id = str(uuid4())
        challenge_id = str(uuid4())
        workspace_dir = Path(self.config.workspace_root) / generation_id
        workspace_dir.mkdir(parents=True, exist_ok=True)
        
        logger.info(f"Starting challenge generation - ID: {challenge_id}, Workspace: {workspace_dir}")
        logger.info(f"Request: track={request.track}, difficulty={request.difficulty}, prompt_length={len(request.prompt)}")
        
        # Update tool registry workspace
        self.tools.workspace_root = workspace_dir
        
        # System prompt for challenge generation
        system_prompt = f"""You are an expert CTF challenge designer and implementer. Your task is to create a COMPLETE, WORKING CTF challenge.

Requirements:
- Track: {request.track}
- Difficulty: {request.difficulty}
- Prompt: {request.prompt}

CRITICAL: You must not just create files - you must BUILD and TEST the actual challenge!

Your workflow MUST include:
1. Design the challenge concept
2. Create all necessary files (scripts, configs, docs)
3. **EXECUTE BUILD COMMANDS** to create the actual challenge artifacts
4. **TEST the challenge** to ensure it works
5. **VERIFY the solution path** works correctly
6. Provide final summary

You have these tools:
- write_file: Create files in the workspace
- read_file: Read existing files
- execute_shell: Run commands (python, make, pip, etc.)
- list_files: Check directory contents

EXECUTION REQUIREMENTS:
- After creating build scripts, you MUST run them using execute_shell
- If you create a Makefile, you MUST run "make build" or "make all"
- You MUST verify the challenge artifacts were actually created
- You MUST test that the solution path works (e.g., run verification scripts)
- Generate a realistic flag in format CTF{{...}}

Example workflow:
1. Create scripts/generate_artifact.py
2. Create flag.txt with CTF{{...}}
3. **RUN: execute_shell("python3 scripts/generate_artifact.py")**
4. **RUN: execute_shell("ls -la challenge/")** to verify artifacts exist
5. **RUN: execute_shell("python3 scripts/verify_artifact.py")** to test

DO NOT STOP until you have created AND BUILT the actual challenge files!"""

        # Initialize conversation
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Create a CTF challenge with these requirements:\n\nPrompt: {request.prompt}\nTrack: {request.track}\nDifficulty: {request.difficulty}"}
        ]
        
        # Run iterative agent loop
        iteration_count = 0
        final_result = {}
        
        logger.info(f"Starting iterative agent loop (max {self.config.max_iterations} iterations)")
        
        while iteration_count < self.config.max_iterations:
            iteration_count += 1
            logger.info(f"Iteration {iteration_count}/{self.config.max_iterations}")
            
            try:
                response = self.client.chat.completions.create(
                    model=self.config.model,
                    messages=messages,
                    tools=self.tools.get_tool_definitions(),
                    tool_choice="auto",
                    temperature=self.config.temperature,
                )
                
                message = response.choices[0].message
                logger.info(f"Agent response - Content length: {len(message.content or '')}, Tool calls: {len(message.tool_calls or [])}")
                
                # Log the actual content if available
                if message.content:
                    logger.info(f"Agent message: {message.content[:200]}{'...' if len(message.content) > 200 else ''}")
                
                # Serialize message for conversation log (avoiding OpenAI objects)
                serializable_message = {
                    "role": "assistant", 
                    "content": message.content,
                    "tool_calls": []
                }
                
                if message.tool_calls:
                    for tool_call in message.tool_calls:
                        serializable_message["tool_calls"].append({
                            "id": tool_call.id,
                            "type": tool_call.type,
                            "function": {
                                "name": tool_call.function.name,
                                "arguments": tool_call.function.arguments
                            }
                        })
                
                messages.append(serializable_message)
                
                # Handle tool calls
                if message.tool_calls:
                    logger.info(f"Executing {len(message.tool_calls)} tool calls")
                    for tool_call in message.tool_calls:
                        function_name = tool_call.function.name
                        logger.info(f"Executing tool: {function_name}")
                        
                        try:
                            arguments = json.loads(tool_call.function.arguments)
                            logger.info(f"Tool arguments: {arguments}")
                        except json.JSONDecodeError as e:
                            logger.warning(f"Failed to parse tool arguments: {e}")
                            arguments = {}
                        
                        # Execute tool
                        tool_result = self.tools.execute_tool(function_name, arguments)
                        logger.info(f"Tool {function_name} result: {tool_result.get('success', 'error' not in tool_result)}")
                        
                        # Add tool result to conversation
                        messages.append({
                            "role": "tool",
                            "tool_call_id": tool_call.id,
                            "name": function_name,
                            "content": json.dumps(tool_result)
                        })
                
                # Check if agent is done (no more tool calls and has content)
                if not message.tool_calls and message.content:
                    # Look for completion indicators
                    content_lower = message.content.lower()
                    completion_phrases = [
                        "challenge is complete", 
                        "generation finished",
                        "final summary",
                        "challenge ready",
                        "challenge has been successfully",
                        "build and test complete",
                        "verification successful"
                    ]
                    if any(phrase in content_lower for phrase in completion_phrases):
                        logger.info("Agent indicated completion")
                        break
                
                # Also check if we're near the iteration limit and no tool calls
                if not message.tool_calls and iteration_count >= self.config.max_iterations - 2:
                    logger.warning("Approaching iteration limit, forcing completion check")
                    # Ask agent to summarize and complete
                    messages.append({
                        "role": "user",
                        "content": "You're approaching the iteration limit. Please build any remaining artifacts, run final tests, and provide a completion summary."
                    })
                
            except Exception as e:
                logger.error(f"Error in iteration {iteration_count}: {str(e)}")
                # Add error to conversation and continue
                messages.append({
                    "role": "user",
                    "content": f"An error occurred: {str(e)}. Please continue or adjust your approach."
                })
        
        logger.info(f"Agent loop completed after {iteration_count} iterations")
        
        # Extract challenge information from workspace
        logger.info("Extracting challenge information from workspace")
        final_result = await self._extract_challenge_info(workspace_dir, messages)
        logger.info(f"Extraction complete - Found {len(final_result.get('files', []))} files")
        
        return GenerateChallengeResponse(
            challenge_id=challenge_id,
            generation_id=generation_id,
            generated_json=final_result,
            provider="openai",
            model=self.config.model,
            tokens_used=None,  # Could be extracted from response usage
            cost_usd=None
        )
    
    async def _extract_challenge_info(self, workspace_dir: Path, messages: List[Dict]) -> Dict[str, Any]:
        """Extract challenge information from the workspace and conversation."""
        
        # Get all files created
        files_created = []
        if workspace_dir.exists():
            for file_path in workspace_dir.rglob('*'):
                if file_path.is_file():
                    try:
                        rel_path = str(file_path.relative_to(workspace_dir))
                        content = file_path.read_text(encoding='utf-8')
                        files_created.append({
                            "path": rel_path,
                            "content": content
                        })
                    except (UnicodeDecodeError, PermissionError):
                        # Skip binary files or files we can't read
                        pass
        
        # Extract key information from conversation
        conversation_text = "\n".join([
            msg.get("content", "") for msg in messages 
            if msg.get("role") == "assistant" and msg.get("content")
        ])
        
        # Try to extract structured information
        challenge_info = {
            "workspace_dir": str(workspace_dir),
            "files": files_created,
            "conversation_log": messages[-10:],  # Keep last 10 messages
            "total_iterations": len([m for m in messages if m.get("role") == "assistant"]),
        }
        
        # Look for flag in files or conversation
        flag = None
        for file_info in files_created:
            if "CTF{" in file_info["content"]:
                import re
                flag_match = re.search(r'CTF\{[^}]+\}', file_info["content"])
                if flag_match:
                    flag = flag_match.group(0)
                    break
        
        if not flag and "CTF{" in conversation_text:
            import re
            flag_match = re.search(r'CTF\{[^}]+\}', conversation_text)
            if flag_match:
                flag = flag_match.group(0)
        
        if flag:
            challenge_info["flag"] = {"format": flag, "placement": "Generated by agent"}
        
        # Try to identify main challenge files
        main_files = [f for f in files_created if any(
            keyword in f["path"].lower() 
            for keyword in ["challenge", "main", "server", "app", "index"]
        )]
        
        if main_files:
            challenge_info["main_files"] = main_files
        
        return challenge_info
