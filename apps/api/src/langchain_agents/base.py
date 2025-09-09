"""
Base agent implementation for CTF challenge generation.
"""
from typing import Dict, Any, List, Optional
from langchain.agents import AgentExecutor
from langchain.memory import ConversationBufferWindowMemory
from langchain.prompts import ChatPromptTemplate
from langchain.chains import LLMChain
from langchain.schema import BaseMemory
from pydantic import BaseModel

from .config import AgentType, LangChainConfig

class BaseAgent(BaseModel):
    """Base agent class for CTF challenge generation"""
    
    agent_type: AgentType
    config: LangChainConfig
    memory: Optional[BaseMemory] = None
    
    class Config:
        arbitrary_types_allowed = True
    
    def __init__(self, agent_type: AgentType, config: LangChainConfig):
        super().__init__(agent_type=agent_type, config=config)
        self.memory = ConversationBufferWindowMemory(
            k=config.memory_window_size,
            return_messages=True
        )
        
    def get_tools(self) -> List[Dict[str, Any]]:
        """Get tools available to this agent"""
        return []
        
    def get_prompt_template(self) -> str:
        """Get the prompt template for this agent"""
        raise NotImplementedError
        
    def create_chain(self, llm: Any) -> LLMChain:
        """Create a LangChain chain for this agent"""
        prompt = ChatPromptTemplate.from_template(
            self.get_prompt_template()
        )
        
        return LLMChain(
            llm=llm,
            prompt=prompt,
            memory=self.memory,
            verbose=True
        )
        
    def create_agent(self, llm: Any) -> AgentExecutor:
        """Create an agent executor"""
        tools = self.get_tools()
        chain = self.create_chain(llm)
        
        return AgentExecutor.from_agent_and_tools(
            agent=chain,
            tools=tools,
            memory=self.memory,
            verbose=True,
            max_iterations=self.config.chain_configs[self.agent_type]["max_iterations"]
        )
        
    async def run(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Run the agent"""
        raise NotImplementedError
