"""
Base agent implementation for CTF challenge generation.
"""
from typing import Dict, Any, List, Optional
from langchain.memory import ConversationBufferWindowMemory
from langchain.prompts import ChatPromptTemplate
from langchain.chains import LLMChain
from langchain.schema import BaseMemory
from pydantic import BaseModel, ConfigDict

from .config import AgentType, LangChainConfig

class BaseAgent(BaseModel):
    """Base agent class for CTF challenge generation"""
    
    agent_type: AgentType
    config: LangChainConfig
    memory: Optional[BaseMemory] = None
    llm: Optional[Any] = None
    
    model_config = ConfigDict(arbitrary_types_allowed=True, extra='allow')
    
    def __init__(self, agent_type: AgentType, config: LangChainConfig):
        super().__init__(agent_type=agent_type, config=config)
        # Disable conversational memory for multi-input prompts to avoid input key conflicts
        self.memory = None
        
    def get_tools(self) -> List[Dict[str, Any]]:
        """Get tools available to this agent"""
        return []
        
    def get_prompt_template(self) -> str:
        """Get the prompt template for this agent"""
        raise NotImplementedError
        
    def create_chain(self, llm: Any) -> LLMChain:
        """Create an LLMChain for this agent using its prompt template.
        Accepts either a string template or a prebuilt ChatPromptTemplate.
        """
        template = self.get_prompt_template()
        if isinstance(template, ChatPromptTemplate):
            prompt = template
        else:
            prompt = ChatPromptTemplate.from_template(template)
        return LLMChain(
            llm=llm,
            prompt=prompt,
            memory=self.memory,
            verbose=True
        )
        
    async def run(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Run the agent with the given inputs
        
        Args:
            inputs: Dictionary containing input parameters for the agent
                   Must include 'task' key with the task description
                   
        Returns:
            Dictionary containing agent outputs and any additional metadata
            
        Raises:
            ValueError: If required inputs are missing
            Exception: If agent execution fails
        """
        if 'task' not in inputs:
            raise ValueError("Input must contain 'task' key")
            
        try:
            # Initialize LLM based on config
            llm = self.config.get_llm()

            # Create and run chain directly
            chain = self.create_chain(llm)
            result = await chain.arun(inputs)
            
            # Process and validate result
            if not isinstance(result, dict):
                result = {"output": result}
                
            # Add metadata
            result["agent_type"] = self.agent_type.value
            result["tools_used"] = [tool.name for tool in self.get_tools()]
            
            # Clear memory after successful run
            if self.memory:
                self.memory.clear()
                
            return result
            
        except Exception as e:
            # Clear memory on failure
            if self.memory:
                self.memory.clear()
            raise Exception(f"Agent execution failed: {str(e)}")