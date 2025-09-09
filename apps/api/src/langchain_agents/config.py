"""
Configuration for LangChain-based CTF challenge generation system.
"""
from enum import Enum
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field
from langchain_openai import ChatOpenAI

class AgentType(str, Enum):
    CHALLENGE_DESIGNER = "challenge_designer"
    CODE_GENERATOR = "code_generator"
    VULNERABILITY_CREATOR = "vulnerability_creator"
    SOLUTION_VALIDATOR = "solution_validator"
    DEPLOYMENT_MANAGER = "deployment_manager"
    
class ChainType(str, Enum):
    DESIGN = "design"
    IMPLEMENTATION = "implementation" 
    VALIDATION = "validation"
    DEPLOYMENT = "deployment"
    DOCUMENTATION = "documentation"

class LangChainConfig(BaseModel):
    """Configuration for LangChain agents and chains"""
    
    # Model configurations
    configs: Dict[str, Dict[str, Any]] = Field(
        default_factory=lambda: {
            "gpt-5": {
                "temperature": 1,
                "model": "gpt-5"
            },
            "gpt-4": {
                "temperature": 1,
                "model": "gpt-4"
            },
            "claude-3-opus": {
                "temperature": 1,
                "model": "claude-3-opus"
            }
        }
    )
    
    # Default agent settings
    default_agent_settings: Dict[str, Any] = Field(
        default_factory=lambda: {
            "temperature": 1,
            "model": "gpt-5"
        }
    )
    
    # Chain configurations
    chain_configs: Dict[ChainType, Dict[str, Any]] = Field(
        default_factory=lambda: {
            ChainType.DESIGN: {
                "max_iterations": 3,
                "required_agents": [
                    AgentType.CHALLENGE_DESIGNER
                ]
            },
            ChainType.IMPLEMENTATION: {
                "max_iterations": 5,
                "required_agents": [
                    AgentType.CODE_GENERATOR,
                    AgentType.VULNERABILITY_CREATOR
                ]
            },
            ChainType.VALIDATION: {
                "max_iterations": 3,
                "required_agents": [
                    AgentType.SOLUTION_VALIDATOR
                ]
            },
            ChainType.DEPLOYMENT: {
                "max_iterations": 2,
                "required_agents": [
                    AgentType.DEPLOYMENT_MANAGER
                ]
            },
            ChainType.DOCUMENTATION: {
                "max_iterations": 2,
                "required_agents": [
                    AgentType.CHALLENGE_DESIGNER
                ]
            }
        }
    )
    
    # Environment configurations
    docker_enabled: bool = True
    kubernetes_enabled: bool = False
    local_deployment_path: str = "/tmp/ctf_challenges"
    
    # Validation settings
    validation_timeout_seconds: int = 300
    max_validation_attempts: int = 3
    
    # Memory settings
    memory_type: str = "buffer_window"
    memory_window_size: int = 5
    
    class Config:
        arbitrary_types_allowed = True

    def get_llm(self):
        """Return a default ChatOpenAI client using default agent settings.
        Adapts token parameter naming for models using the Responses API.
        """
        settings = dict(self.default_agent_settings)
        # Use Chat Completions-compatible parameter naming
        return ChatOpenAI(**settings)
