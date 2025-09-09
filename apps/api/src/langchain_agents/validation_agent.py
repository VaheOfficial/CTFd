"""
Validation agent for testing and verifying CTF challenges.
"""
from typing import Dict, Any, List
from langchain.tools import Tool
from langchain.agents import AgentExecutor
from langchain.schema import BaseMemory

from .base import BaseAgent
from .config import AgentType, LangChainConfig
from .templates import validation_template
from langchain.chains import LLMChain
from datetime import datetime

class ValidationAgent(BaseAgent):
    """Agent responsible for validating CTF challenges"""
    
    def __init__(self, config: LangChainConfig):
        super().__init__(
            agent_type=AgentType.SOLUTION_VALIDATOR,
            config=config
        )
        object.__setattr__(self, 'llm', config.get_llm())
    
    def get_tools(self) -> List[Tool]:
        """Get tools available to the validator"""
        return [
            Tool(
                name="test_functionality",
                func=self._test_functionality,
                description="Test basic challenge functionality"
            ),
            Tool(
                name="verify_solution",
                func=self._verify_solution,
                description="Verify the solution path works"
            ),
            Tool(
                name="check_security",
                func=self._check_security,
                description="Check security boundaries"
            ),
            Tool(
                name="assess_difficulty",
                func=self._assess_difficulty,
                description="Assess challenge difficulty"
            ),
            Tool(
                name="monitor_resources",
                func=self._monitor_resources,
                description="Monitor resource usage"
            )
        ]
        
    def get_prompt_template(self) -> str:
        """Get the prompt template for validation"""
        return validation_template

    async def _test_functionality(self, spec: Dict[str, Any]) -> Dict[str, Any]:
        """Test basic challenge functionality"""
        chain = LLMChain(llm=self.config.get_llm(), prompt=validation_template)
        result = await chain.arun({
            "challenge_implementation": spec.get("challenge_implementation"),
            "solution_path": spec.get("solution_path", [])
        })
        return {
            "result": result,
            "metadata": {"tool": "test_functionality", "timestamp": datetime.now().isoformat()}
        }
        
    async def _verify_solution(self, spec: Dict[str, Any]) -> Dict[str, Any]:
        """Verify the solution path"""
        chain = LLMChain(llm=self.config.get_llm(), prompt=validation_template)
        result = await chain.arun({
            "challenge_implementation": spec.get("challenge_implementation"),
            "solution_path": spec.get("solution_path", [])
        })
        return {
            "result": result,
            "metadata": {"tool": "verify_solution", "timestamp": datetime.now().isoformat()}
        }
        
    async def _check_security(self, spec: Dict[str, Any]) -> Dict[str, Any]:
        """Check security boundaries"""
        chain = LLMChain(llm=self.config.get_llm(), prompt=validation_template)
        result = await chain.arun({
            "challenge_implementation": spec.get("challenge_implementation"),
            "solution_path": spec.get("solution_path", [])
        })
        return {
            "result": result,
            "metadata": {"tool": "check_security", "timestamp": datetime.now().isoformat()}
        }
        
    async def _assess_difficulty(self, spec: Dict[str, Any]) -> Dict[str, Any]:
        """Assess challenge difficulty"""
        chain = LLMChain(llm=self.config.get_llm(), prompt=validation_template)
        result = await chain.arun({
            "challenge_implementation": spec.get("challenge_implementation"),
            "solution_path": spec.get("solution_path", [])
        })
        return {
            "result": result,
            "metadata": {"tool": "assess_difficulty", "timestamp": datetime.now().isoformat()}
        }
        
    async def _monitor_resources(self, spec: Dict[str, Any]) -> Dict[str, Any]:
        """Monitor resource usage"""
        chain = LLMChain(llm=self.config.get_llm(), prompt=validation_template)
        result = await chain.arun({
            "challenge_implementation": spec.get("challenge_implementation"),
            "solution_path": spec.get("solution_path", [])
        })
        return {
            "result": result,
            "metadata": {"tool": "monitor_resources", "timestamp": datetime.now().isoformat()}
        }
