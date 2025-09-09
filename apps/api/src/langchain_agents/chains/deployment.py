"""
Deployment chain for setting up CTF challenge environments.
"""
from typing import Dict, Any, List
from langchain.chains import LLMChain
from langchain.prompts import ChatPromptTemplate

from .base import BaseGenerationChain
from ..config import ChainType, LangChainConfig
from ..deployment_agent import DeploymentAgent

class DeploymentChain(BaseGenerationChain):
    """Chain for coordinating challenge deployment"""
    
    def __init__(self, config: LangChainConfig):
        super().__init__(
            chain_type=ChainType.DEPLOYMENT,
            config=config
        )
        self.deployment_manager = DeploymentAgent(config)
        
    async def _acall(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Execute the deployment chain"""
        self._validate_inputs(inputs)
        
        # Extract challenge implementation
        challenge = inputs["input"]
        
        # Run deployment
        deployment_result = await self.deployment_manager.run({
            "challenge_implementation": challenge,
            "infrastructure_requirements": challenge.get("infrastructure_requirements", {}),
            "task": "Deploy this CTF challenge"
        })
        
        output = {"output": deployment_result}
        self._validate_outputs(output)
        return output
