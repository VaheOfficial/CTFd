"""
Deployment agent for setting up CTF challenge environments.
"""
from typing import Dict, Any, List
from datetime import datetime
from langchain.tools import Tool
from langchain.agents import AgentExecutor
from langchain.schema import BaseMemory
from langchain.chains import LLMChain

from .base import BaseAgent
from .config import AgentType, LangChainConfig
from .templates.deployment import deployment_template
from .templates.deployment_tools import (
    infrastructure_setup_template,
    network_config_template,
    security_config_template,
    resource_allocation_template,
    monitoring_setup_template
)

class DeploymentAgent(BaseAgent):
    """Agent responsible for deploying CTF challenges"""
    
    def __init__(self, config: LangChainConfig):
        super().__init__(
            agent_type=AgentType.DEPLOYMENT_MANAGER,
            config=config
        )
        # Initialize LLM for tool-specific operations
        object.__setattr__(self, 'llm', config.get_llm())
    
    def get_tools(self) -> List[Tool]:
        """Get tools available to the deployment manager"""
        return [
            Tool(
                name="setup_infrastructure",
                func=self._setup_infrastructure,
                description="Set up required infrastructure including containers, VMs, and networking"
            ),
            Tool(
                name="configure_networking",
                func=self._configure_networking,
                description="Configure network settings including isolation, routing, and access controls"
            ),
            Tool(
                name="setup_security",
                func=self._setup_security,
                description="Configure security settings including permissions, firewalls, and monitoring"
            ),
            Tool(
                name="allocate_resources",
                func=self._allocate_resources,
                description="Allocate required compute, memory, and storage resources"
            ),
            Tool(
                name="setup_monitoring",
                func=self._setup_monitoring,
                description="Set up monitoring and logging for the challenge environment"
            )
        ]
        
    def get_prompt_template(self) -> str:
        """Get the prompt template for deployment"""
        return deployment_template

    async def _setup_infrastructure(self, spec: Dict[str, Any]) -> Dict[str, Any]:
        """Set up required infrastructure"""
        # Create and run chain
        chain = LLMChain(llm=self.llm, prompt=infrastructure_setup_template)
        result = await chain.arun(spec)
        
        # Process and structure the result
        return {
            "infrastructure_plan": result,
            "metadata": {
                "tool": "setup_infrastructure",
                "timestamp": datetime.now().isoformat()
            }
        }
        
    async def _configure_networking(self, spec: Dict[str, Any]) -> Dict[str, Any]:
        """Configure network settings"""
        # Create and run chain
        chain = LLMChain(llm=self.llm, prompt=network_config_template)
        result = await chain.arun(spec)
        
        # Process and structure the result
        return {
            "network_config": result,
            "metadata": {
                "tool": "configure_networking",
                "timestamp": datetime.now().isoformat()
            }
        }
        
    async def _setup_security(self, spec: Dict[str, Any]) -> Dict[str, Any]:
        """Configure security settings"""
        # Create and run chain
        chain = LLMChain(llm=self.llm, prompt=security_config_template)
        result = await chain.arun(spec)
        
        # Process and structure the result
        return {
            "security_config": result,
            "metadata": {
                "tool": "setup_security",
                "timestamp": datetime.now().isoformat()
            }
        }
        
    async def _allocate_resources(self, spec: Dict[str, Any]) -> Dict[str, Any]:
        """Allocate required resources"""
        # Create and run chain
        chain = LLMChain(llm=self.llm, prompt=resource_allocation_template)
        result = await chain.arun(spec)
        
        # Process and structure the result
        return {
            "resource_allocation": result,
            "metadata": {
                "tool": "allocate_resources",
                "timestamp": datetime.now().isoformat()
            }
        }
        
    async def _setup_monitoring(self, spec: Dict[str, Any]) -> Dict[str, Any]:
        """Set up monitoring"""
        # Create and run chain
        chain = LLMChain(llm=self.llm, prompt=monitoring_setup_template)
        result = await chain.arun(spec)
        
        # Process and structure the result
        return {
            "monitoring_config": result,
            "metadata": {
                "tool": "setup_monitoring",
                "timestamp": datetime.now().isoformat()
            }
        }