"""
Base chain implementation for CTF challenge generation.
"""
from pydantic import BaseModel, ConfigDict
from typing import Dict, Any, List, Optional
import asyncio
from langchain.schema.runnable import Runnable
from langchain.schema import BaseMemory

from ..config import ChainType, LangChainConfig

class BaseGenerationChain(BaseModel, Runnable):
    """Base chain for challenge generation process"""
    
    chain_type: ChainType
    config: LangChainConfig
    memory: Optional[BaseMemory] = None
    
    model_config = ConfigDict(arbitrary_types_allowed=True)
    
    @property
    def input_keys(self) -> List[str]:
        """Input keys for the chain"""
        return ["input"]
        
    @property
    def output_keys(self) -> List[str]:
        """Output keys for the chain"""
        return ["output"]
        
    def _validate_inputs(self, inputs: Dict[str, Any]) -> None:
        """Validate chain inputs"""
        if "input" not in inputs:
            raise ValueError("Input dictionary must contain 'input' key")
            
    def _validate_outputs(self, outputs: Dict[str, Any]) -> None:
        """Validate chain outputs"""
        if "output" not in outputs:
            raise ValueError("Output dictionary must contain 'output' key")
            
    async def _acall(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Async execution of the chain"""
        raise NotImplementedError

    async def run(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Convenience async runner that wraps inputs under the required 'input' key."""
        wrapped_inputs = {"input": inputs}
        return await self._acall(wrapped_inputs)

    # Runnable interface
    async def ainvoke(self, input: Dict[str, Any], config: Any = None, **kwargs: Any) -> Dict[str, Any]:
        payload = input if "input" in input else {"input": input}
        return await self._acall(payload)

    def invoke(self, input: Dict[str, Any], config: Any = None, **kwargs: Any) -> Dict[str, Any]:
        return asyncio.run(self.ainvoke(input, config=config, **kwargs))
