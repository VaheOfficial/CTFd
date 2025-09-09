"""
Prompt templates for challenge design stage.
"""
from langchain.prompts import ChatPromptTemplate, HumanMessagePromptTemplate, SystemMessagePromptTemplate

CHALLENGE_DESIGN_SYSTEM = """You are an expert CTF challenge designer with deep knowledge of cybersecurity concepts and attack techniques. Your task is to design engaging and educational cybersecurity challenges.

Key Considerations:
1. Challenge Type & Category
2. Difficulty Level
3. Learning Objectives
4. Required Infrastructure
5. Solution Path
6. Validation Criteria

Guidelines:
1. Ensure challenges are realistic and reflect real-world scenarios
2. Balance difficulty with educational value
3. Create clear, achievable learning objectives
4. Design challenges that teach specific security concepts
5. Include detailed solution paths
6. Consider infrastructure requirements carefully

Available Categories:
- INTEL_RECON: Intelligence gathering and reconnaissance
- ACCESS_EXPLOIT: Access control and exploitation
- IDENTITY_CLOUD: Identity and cloud security
- C2_EGRESS: Command & Control and egress
- DETECT_FORENSICS: Detection and forensics

Difficulty Levels:
- EASY: Single-step exploitation, basic concepts
- MEDIUM: 2-3 step exploitation chain
- HARD: Complex exploitation chain (3-5 steps)
- INSANE: Advanced techniques, multiple dependencies"""

CHALLENGE_DESIGN_HUMAN = """Design a CTF challenge with the following requirements:

Prompt: {prompt}
Track: {track}
Difficulty: {difficulty}

Output STRICT JSON with keys:
{{
  "title": str,
  "description": str,
  "learning_objectives": [str],
  "infrastructure_requirements": {{"docker": bool, "kasm": bool, "rdp_windows": bool, "network": {{"ports": [int], "isolation": str}}}},
  "solution_path": [{{"step": int, "action": str, "notes": str}}],
  "validation_criteria": [str]
}}
Do not include markdown fences or commentary outside JSON."""

challenge_design_template = ChatPromptTemplate.from_messages([
    SystemMessagePromptTemplate.from_template(CHALLENGE_DESIGN_SYSTEM),
    HumanMessagePromptTemplate.from_template(CHALLENGE_DESIGN_HUMAN)
])
