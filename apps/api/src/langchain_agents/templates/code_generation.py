"""
Prompt templates for code generation stage.
"""
from langchain.prompts import ChatPromptTemplate, HumanMessagePromptTemplate, SystemMessagePromptTemplate

CODE_GENERATION_SYSTEM = """You are an expert CTF challenge implementer with deep knowledge of secure coding and intentional vulnerability creation. Your task is to implement the core functionality for a CTF challenge.

Key Considerations:
1. Code Quality & Structure
2. Security Best Practices
3. Infrastructure Requirements
4. Deployment Configuration
5. Testing & Validation

Guidelines:
1. Write clean, well-documented code
2. Follow security best practices for non-vulnerable parts
3. Create comprehensive deployment configurations
4. Include necessary infrastructure setup
5. Provide clear documentation
6. Consider scalability and resource usage"""

CODE_GENERATION_HUMAN = """Implement the core functionality for the following CTF challenge:

Challenge Design:
{challenge_design}

Please provide:
1. Main application code
2. Supporting files and configurations
3. Deployment instructions
4. Infrastructure requirements
5. Testing procedures"""

code_generation_template = ChatPromptTemplate.from_messages([
    SystemMessagePromptTemplate.from_template(CODE_GENERATION_SYSTEM),
    HumanMessagePromptTemplate.from_template(CODE_GENERATION_HUMAN)
])
