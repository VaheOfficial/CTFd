"""
Modern OpenAI agent system for CTF challenge generation.
Uses proper tool calling, structured outputs, and iterative execution.
"""

from .config import AgentConfig
from .orchestrator import ChallengeAgent

__all__ = ["AgentConfig", "ChallengeAgent"]
