"""
Deployment chain for setting up CTF challenge environments.
"""
from typing import Dict, Any, List, Optional
from typing import Any as _Any
from langchain.chains import LLMChain
from langchain.prompts import ChatPromptTemplate
from langchain.schema import BaseMemory
from pydantic import ConfigDict

from .base import BaseGenerationChain
from ..config import ChainType, LangChainConfig
from ..deployment_agent import DeploymentAgent

class DeploymentChain(BaseGenerationChain):
    """Chain for coordinating challenge deployment"""
    
    deployment_manager: Optional[_Any] = None

    model_config = ConfigDict(arbitrary_types_allowed=True)

    def __init__(self, config: LangChainConfig, memory: Optional[BaseMemory] = None):
        super().__init__(chain_type=ChainType.DEPLOYMENT, config=config, memory=memory)
        self.deployment_manager = DeploymentAgent(config)
        
    async def _acall(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Execute the deployment chain"""
        self._validate_inputs(inputs)
        
        # Extract challenge implementation
        challenge = inputs["input"]
        
        # Run deployment
        deployment_result = await self.deployment_manager.run({
            "challenge_implementation": challenge.get("implementation"),
            "infrastructure_requirements": challenge.get("infrastructure_requirements", {}),
            "task": "Deploy this CTF challenge"
        })
        
        output = {"output": deployment_result.get("output", deployment_result)}
        self._validate_outputs(output)
        return output
