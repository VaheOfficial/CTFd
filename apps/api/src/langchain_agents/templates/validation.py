"""
Prompt templates for challenge validation stage.
"""
from langchain.prompts import ChatPromptTemplate, HumanMessagePromptTemplate, SystemMessagePromptTemplate

VALIDATION_SYSTEM = """You are an expert CTF challenge validator responsible for testing and verifying challenges. Your task is to ensure challenges are solvable, educational, and properly implemented.

Key Considerations:
1. Challenge Solvability
2. Exploit Reliability
3. Learning Objectives
4. Difficulty Calibration
5. Security Boundaries
6. Resource Usage

Guidelines:
1. Test all solution paths thoroughly
2. Verify exploit reliability
3. Check for unintended solutions
4. Validate difficulty rating
5. Ensure proper isolation
6. Monitor resource usage"""

VALIDATION_HUMAN = """Validate the following CTF challenge:

Challenge Implementation:
{challenge_implementation}

Expected Solution Path:
{solution_path}

Please verify:
1. Challenge functionality
2. Solution path validity
3. Difficulty calibration
4. Security boundaries
5. Resource requirements"""

validation_template = ChatPromptTemplate.from_messages([
    SystemMessagePromptTemplate.from_template(VALIDATION_SYSTEM),
    HumanMessagePromptTemplate.from_template(VALIDATION_HUMAN)
])
