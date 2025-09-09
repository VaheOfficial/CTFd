"""
Design chain for coordinating the challenge design process.
"""
from typing import Dict, Any, List
from langchain.chains import LLMChain
from langchain.prompts import ChatPromptTemplate

from .base import BaseGenerationChain
from ..config import ChainType, LangChainConfig
from ..challenge_designer import ChallengeDesignerAgent

class DesignChain(BaseGenerationChain):
    """Chain for coordinating challenge design"""
    
    def __init__(self, config: LangChainConfig):
        super().__init__(
            chain_type=ChainType.DESIGN,
            config=config
        )
        self.designer = ChallengeDesignerAgent(config)
        
    async def _acall(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Execute the design chain"""
        self._validate_inputs(inputs)
        
        # Extract requirements
        requirements = inputs["input"]
        
        # Run the designer agent
        design_result = await self.designer.run({
            "user_requirements": requirements.get("prompt", ""),
            "track": requirements.get("track"),
            "difficulty": requirements.get("difficulty"),
            "task": "Design a complete CTF challenge based on the given requirements"
        })
        
        # Validate and return results
        output = {"output": design_result}
        self._validate_outputs(output)
        return output
