"""
Orchestrator for managing the CTF challenge generation pipeline.
"""
from typing import Dict, Any, Optional
from langchain.chat_models import ChatOpenAI, ChatAnthropic
from langchain.schema import BaseMemory
from pydantic import BaseModel

from .config import LangChainConfig, ChainType, AgentType
from .chains import DesignChain, ImplementationChain, ValidationChain, DeploymentChain
from ..schemas.ai_challenge import (
    GenerateChallengeRequest,
    GenerateChallengeResponse,
    LLMProvider
)

class GenerationOrchestrator(BaseModel):
    """Orchestrates the challenge generation process using multiple agents"""
    
    config: LangChainConfig
    memory: Optional[BaseMemory] = None
    
    class Config:
        arbitrary_types_allowed = True
        
    def _get_llm(self, provider: LLMProvider):
        """Get the appropriate LLM based on provider"""
        if provider == LLMProvider.GPT5:
            return ChatOpenAI(
                **self.config.model_configs["gpt-4"]
            )
        elif provider == LLMProvider.CLAUDE:
            return ChatAnthropic(
                **self.config.model_configs["claude-3-opus"]
            )
        else:
            # Default to GPT-4
            return ChatOpenAI(
                **self.config.model_configs["gpt-4"]
            )
            
    async def generate_challenge(
        self,
        request: GenerateChallengeRequest
    ) -> GenerateChallengeResponse:
        """
        Generate a complete CTF challenge using multiple agents
        """
        # Get LLM
        llm = self._get_llm(request.preferred_provider)
        
        # Initialize chains
        design_chain = DesignChain(self.config)
        implementation_chain = ImplementationChain(self.config)
        validation_chain = ValidationChain(self.config)
        deployment_chain = DeploymentChain(self.config)
        
        # Step 1: Design Challenge
        design_result = await design_chain.run({
            "prompt": request.prompt,
            "track": request.track,
            "difficulty": request.difficulty
        })
        
        # Step 2: Implement Challenge
        implementation_result = await implementation_chain.run(design_result)
        
        # Step 3: Validate Challenge
        validation_result = await validation_chain.run({
            **design_result["output"],
            **implementation_result["output"]
        })
        
        # Only proceed with deployment if validation passed
        if validation_result["output"].get("is_valid", False):
            # Step 4: Deploy Challenge
            deployment_result = await deployment_chain.run({
                **design_result["output"],
                **implementation_result["output"],
                **validation_result["output"]
            })
            
            # Combine results
            final_result = {
                **design_result["output"],
                **implementation_result["output"],
                "validation": validation_result["output"],
                "deployment": deployment_result["output"]
            }
        else:
            # If validation failed, return without deployment
            final_result = {
                **design_result["output"],
                **implementation_result["output"],
                "validation": validation_result["output"],
                "deployment": {"status": "skipped", "reason": "validation_failed"}
            }
        return GenerateChallengeResponse(
            challenge_id="temp_id",  # This will be replaced
            generation_id="temp_gen_id",  # This will be replaced
            generated_json=final_result,
            provider=str(request.preferred_provider),
            model="gpt-4",  # This will be dynamic
            tokens_used=None,  # This will be tracked
            cost_usd=None  # This will be calculated
        )
