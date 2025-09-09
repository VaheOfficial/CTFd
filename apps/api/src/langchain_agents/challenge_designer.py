"""
Challenge designer agent for generating CTF challenge specifications.
"""
from typing import Dict, Any, List
from langchain.tools import Tool
from langchain.agents import AgentExecutor
from langchain.schema import BaseMemory

from .base import BaseAgent
from .config import AgentType, LangChainConfig
from .templates import challenge_design_template

class ChallengeDesignerAgent(BaseAgent):
    """Agent responsible for designing CTF challenges"""
    
    def __init__(self, config: LangChainConfig):
        super().__init__(
            agent_type=AgentType.CHALLENGE_DESIGNER,
            config=config
        )
    
    def get_tools(self) -> List[Tool]:
        """Get tools available to the challenge designer"""
        return [
            Tool(
                name="analyze_difficulty",
                func=self._analyze_difficulty,
                description="Analyze and determine appropriate challenge difficulty"
            ),
            Tool(
                name="generate_scenario",
                func=self._generate_scenario,
                description="Generate a realistic attack/defense scenario"
            ),
            Tool(
                name="plan_solution_path",
                func=self._plan_solution_path,
                description="Plan the intended solution path for the challenge"
            )
        ]
        
    def get_prompt_template(self) -> str:
        """Get the prompt template for challenge design"""
        return challenge_design_template