"""
Validation chain for testing and verifying CTF challenges.
"""
from typing import Dict, Any, List
from langchain.chains import LLMChain
from langchain.prompts import ChatPromptTemplate

from .base import BaseGenerationChain
from ..config import ChainType, LangChainConfig
from ..validation_agent import ValidationAgent

class ValidationChain(BaseGenerationChain):
    """Chain for coordinating challenge validation"""
    
    def __init__(self, config: LangChainConfig):
        super().__init__(
            chain_type=ChainType.VALIDATION,
            config=config
        )
        self.validator = ValidationAgent(config)
        
    async def _acall(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Execute the validation chain"""
        self._validate_inputs(inputs)
        
        # Extract challenge implementation
        challenge = inputs["input"]
        
        # Run validation
        validation_result = await self.validator.run({
            "challenge_implementation": challenge,
            "solution_path": challenge.get("solution_path", []),
            "task": "Validate this CTF challenge implementation"
        })
        
        # If validation fails, we might want to trigger a fix
        if not validation_result.get("is_valid", False):
            # TODO: Implement fix chain
            pass
        
        output = {"output": validation_result}
        self._validate_outputs(output)
        return output
