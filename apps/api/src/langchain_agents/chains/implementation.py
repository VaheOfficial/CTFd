"""
Implementation chain for coordinating challenge code generation and vulnerability implementation.
"""
from typing import Dict, Any, List
from langchain.chains import LLMChain
from langchain.prompts import ChatPromptTemplate

from .base import BaseGenerationChain
from ..config import ChainType, LangChainConfig
from ..code_generator import CodeGeneratorAgent
from ..vulnerability_creator import VulnerabilityCreatorAgent

class ImplementationChain(BaseGenerationChain):
    """Chain for coordinating challenge implementation"""
    
    def __init__(self, config: LangChainConfig):
        super().__init__(
            chain_type=ChainType.IMPLEMENTATION,
            config=config
        )
        self.code_generator = CodeGeneratorAgent(config)
        self.vulnerability_creator = VulnerabilityCreatorAgent(config)
        
    async def _acall(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Execute the implementation chain"""
        self._validate_inputs(inputs)
        
        # Extract design
        design = inputs["input"]
        
        # Step 1: Generate core functionality
        code_result = await self.code_generator.run({
            "challenge_design": design,
            "task": "Implement the core functionality for this CTF challenge"
        })
        
        # Step 2: Implement vulnerabilities
        vulnerability_result = await self.vulnerability_creator.run({
            "challenge_code": code_result,
            "vulnerability_requirements": design.get("solution_path"),
            "task": "Implement the required vulnerabilities in the challenge code"
        })
        
        # Combine results
        output = {
            "output": {
                "implementation": code_result,
                "vulnerabilities": vulnerability_result
            }
        }
        
        self._validate_outputs(output)
        return output
