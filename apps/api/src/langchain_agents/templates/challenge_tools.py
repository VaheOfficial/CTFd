"""
Prompt templates for challenge designer tools.
"""
from langchain.prompts import ChatPromptTemplate, HumanMessagePromptTemplate, SystemMessagePromptTemplate

# Difficulty Analysis Templates
DIFFICULTY_ANALYSIS_SYSTEM = """You are an expert CTF challenge difficulty analyst. Your task is to analyze and validate challenge difficulty levels.

Key Considerations:
1. Technical Skills Required
2. Time Investment
3. Complexity of Concepts
4. Prerequisites
5. Learning Curve

Guidelines:
1. Consider target audience
2. Evaluate technical requirements
3. Assess time commitment
4. Review prerequisites
5. Analyze learning progression"""

DIFFICULTY_ANALYSIS_HUMAN = """Analyze the difficulty level for this CTF challenge:

Target Difficulty: {target_difficulty}
Requirements: {requirements}
Constraints: {constraints}

Please provide:
1. Validated difficulty assessment
2. Detailed justification
3. Balancing recommendations"""

difficulty_analysis_template = ChatPromptTemplate.from_messages([
    SystemMessagePromptTemplate.from_template(DIFFICULTY_ANALYSIS_SYSTEM),
    HumanMessagePromptTemplate.from_template(DIFFICULTY_ANALYSIS_HUMAN)
])

# Scenario Generation Templates
SCENARIO_GENERATION_SYSTEM = """You are an expert CTF scenario designer. Your task is to create engaging and realistic attack/defense scenarios.

Key Considerations:
1. Technical Context
2. Real-world Relevance
3. Learning Objectives
4. Engagement Level
5. Progression Flow

Guidelines:
1. Create realistic scenarios
2. Include technical details
3. Focus on learning goals
4. Make it engaging
5. Consider progression"""

SCENARIO_GENERATION_HUMAN = """Generate a detailed scenario for this CTF challenge:

Track: {track}
Context: {context}
Constraints: {constraints}

Please provide:
1. Background story
2. Technical context
3. Learning objectives
4. Real-world connections
5. Event progression"""

scenario_generation_template = ChatPromptTemplate.from_messages([
    SystemMessagePromptTemplate.from_template(SCENARIO_GENERATION_SYSTEM),
    HumanMessagePromptTemplate.from_template(SCENARIO_GENERATION_HUMAN)
])

# Solution Path Templates
SOLUTION_PATH_SYSTEM = """You are an expert CTF solution designer. Your task is to create clear and educational solution paths.

Key Considerations:
1. Step Progression
2. Hint System
3. Validation Points
4. Common Pitfalls
5. Learning Outcomes

Guidelines:
1. Create clear steps
2. Design progressive hints
3. Include checkpoints
4. Address common issues
5. Focus on learning"""

SOLUTION_PATH_HUMAN = """Design a solution path for this CTF challenge:

Scenario: {scenario}
Difficulty: {difficulty}
Constraints: {constraints}

Please provide:
1. Step-by-step solution
2. Progressive hints
3. Validation checkpoints
4. Common pitfalls
5. Required tools/knowledge"""

solution_path_template = ChatPromptTemplate.from_messages([
    SystemMessagePromptTemplate.from_template(SOLUTION_PATH_SYSTEM),
    HumanMessagePromptTemplate.from_template(SOLUTION_PATH_HUMAN)
])
