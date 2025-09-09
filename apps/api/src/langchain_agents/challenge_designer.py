"""
Challenge designer agent for generating CTF challenge specifications.
"""
from typing import Dict, Any, List
from datetime import datetime
from langchain.tools import Tool
from langchain.agents import AgentExecutor
from langchain.schema import BaseMemory
from langchain.chains import LLMChain

from .base import BaseAgent
from .config import AgentType, LangChainConfig
from .templates.challenge_design import challenge_design_template
from .templates.challenge_tools import (
    difficulty_analysis_template,
    scenario_generation_template,
    solution_path_template
)

class ChallengeDesignerAgent(BaseAgent):
    """Agent responsible for designing CTF challenges"""
    
    def __init__(self, config: LangChainConfig):
        super().__init__(
            agent_type=AgentType.CHALLENGE_DESIGNER,
            config=config
        )
        # Initialize LLM for tool-specific operations
        object.__setattr__(self, 'llm', config.get_llm())
    
    def get_tools(self) -> List[Tool]:
        """Get tools available to the challenge designer"""
        return [
            Tool(
                name="analyze_difficulty",
                func=self._analyze_difficulty,
                description="Analyze and determine appropriate challenge difficulty based on requirements and target audience"
            ),
            Tool(
                name="generate_scenario",
                func=self._generate_scenario,
                description="Generate a realistic attack/defense scenario with detailed context and background"
            ),
            Tool(
                name="plan_solution_path",
                func=self._plan_solution_path,
                description="Plan the intended solution path including all steps, hints, and potential roadblocks"
            )
        ]
        
    def get_prompt_template(self) -> str:
        """Get the prompt template for challenge design"""
        return challenge_design_template
        
    async def _analyze_difficulty(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze and determine appropriate challenge difficulty"""
        # Create and run chain
        chain = LLMChain(llm=self.llm, prompt=difficulty_analysis_template)
        result = await chain.arun(inputs)
        
        # Process and structure the result
        return {
            "difficulty": inputs.get("target_difficulty"),
            "analysis": result,
            "metadata": {
                "tool": "analyze_difficulty",
                "timestamp": datetime.now().isoformat()
            }
        }
        
    async def _generate_scenario(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Generate a realistic attack/defense scenario"""
        # Create and run chain
        chain = LLMChain(llm=self.llm, prompt=scenario_generation_template)
        result = await chain.arun(inputs)
        
        # Process and structure the result
        return {
            "scenario": result,
            "metadata": {
                "track": inputs.get("track"),
                "tool": "generate_scenario",
                "timestamp": datetime.now().isoformat()
            }
        }
        
    async def _plan_solution_path(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Plan the intended solution path"""
        # Create and run chain
        chain = LLMChain(llm=self.llm, prompt=solution_path_template)
        result = await chain.arun(inputs)
        
        # Process and structure the result
        return {
            "solution_path": result,
            "metadata": {
                "difficulty": inputs.get("difficulty"),
                "tool": "plan_solution_path",
                "timestamp": datetime.now().isoformat()
            }
        }