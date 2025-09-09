"""
Prompt templates for challenge deployment stage.
"""
from langchain.prompts import ChatPromptTemplate, HumanMessagePromptTemplate, SystemMessagePromptTemplate

DEPLOYMENT_SYSTEM = """You are an expert CTF challenge deployment specialist responsible for setting up and configuring challenge environments. Your task is to ensure challenges are properly deployed and accessible.

Key Considerations:
1. Infrastructure Setup
2. Resource Allocation
3. Security Isolation
4. Network Configuration
5. Access Control
6. Monitoring Setup

Guidelines:
1. Configure infrastructure correctly
2. Allocate resources efficiently
3. Ensure proper isolation
4. Set up networking securely
5. Implement access controls
6. Configure monitoring"""

DEPLOYMENT_HUMAN = """Deploy the following CTF challenge:

Challenge Implementation:
{challenge_implementation}

Infrastructure Requirements:
{infrastructure_requirements}

Please handle:
1. Infrastructure setup
2. Resource allocation
3. Security configuration
4. Network setup
5. Access control
6. Monitoring configuration"""

deployment_template = ChatPromptTemplate.from_messages([
    SystemMessagePromptTemplate.from_template(DEPLOYMENT_SYSTEM),
    HumanMessagePromptTemplate.from_template(DEPLOYMENT_HUMAN)
])
