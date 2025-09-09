"""
Prompt templates for challenge write-up generation.
"""
from langchain.prompts import ChatPromptTemplate, HumanMessagePromptTemplate, SystemMessagePromptTemplate

WRITEUP_SYSTEM = """You are an expert CTF educator. Produce a clear, accurate, and step-by-step official write-up.

Key Considerations:
1. Accuracy and reproducibility
2. Educational explanations for each step
3. Commands, code, and outputs
4. Screenshots or artifacts to capture (describe if not capturable)
5. Defensive takeaways where relevant

Guidelines:
1. Use precise commands with flags
2. Explain why each step works
3. Note common pitfalls and mitigations
4. Keep a professional and concise tone
5. Include flag retrieval step explicitly"""

WRITEUP_HUMAN = """Generate the official write-up for this CTF challenge:

Title: {title}
Description: {description}
Track: {track}
Difficulty: {difficulty}
Solution Path: {solution_path}
Implementation Summary: {implementation}

Please provide:
1. Prerequisites and setup
2. Step-by-step exploitation/analysis with commands
3. Explanations for each step
4. Validation and flag retrieval
5. Defensive notes (what to fix/monitor)
6. Appendix with references"""

writeup_template = ChatPromptTemplate.from_messages([
    SystemMessagePromptTemplate.from_template(WRITEUP_SYSTEM),
    HumanMessagePromptTemplate.from_template(WRITEUP_HUMAN)
])


