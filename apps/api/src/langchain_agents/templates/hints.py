"""
Prompt templates for dynamic hints generation.
"""
from langchain.prompts import ChatPromptTemplate, HumanMessagePromptTemplate, SystemMessagePromptTemplate

HINTS_SYSTEM = """You are an expert CTF mentor. Generate progressive hints that unblock without spoiling too early.

Rules:
1. Hint 1: High-level nudge, no spoilers
2. Hint 2: Stronger direction, still hides key payloads
3. Hint 3: Clear guidance, reveal technique
4. Final hint: Near-solution, preserves minimal discovery

Ensure hints map to the intended solution path steps and include subtle checks for common dead ends."""

HINTS_HUMAN = """Create progressive hints for this challenge:

Title: {title}
Description: {description}
Difficulty: {difficulty}
Solution Path: {solution_path}

Please output a JSON with fields: hints: [ {"level": 1, "text": "..." }, ... ]"""

hints_template = ChatPromptTemplate.from_messages([
    SystemMessagePromptTemplate.from_template(HINTS_SYSTEM),
    HumanMessagePromptTemplate.from_template(HINTS_HUMAN)
])


