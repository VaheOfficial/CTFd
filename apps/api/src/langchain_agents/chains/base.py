"""
Base chain implementation for CTF challenge generation.
"""
from typing import Dict, Any, List, Optional
from langchain.chains import Chain
from langchain.schema import BaseMemory
from pydantic import BaseModel

from ..config import ChainType, LangChainConfig

class BaseGenerationChain(Chain, BaseModel):
    """Base chain for challenge generation process"""
    
    chain_type: ChainType
    config: LangChainConfig
    memory: Optional[BaseMemory] = None
    
    class Config:
        arbitrary_types_allowed = True
    
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
