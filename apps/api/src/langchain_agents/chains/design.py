"""
Design chain for coordinating the challenge design process.
"""
from typing import Dict, Any, List, Optional
from typing import Any as _Any
from langchain.chains import LLMChain
from langchain.prompts import ChatPromptTemplate
from langchain.schema import BaseMemory
from pydantic import ConfigDict
import json

from .base import BaseGenerationChain
from ..config import ChainType, LangChainConfig
from ..challenge_designer import ChallengeDesignerAgent

class DesignChain(BaseGenerationChain):
    """Chain for coordinating challenge design"""
    
    designer: Optional[_Any] = None

    model_config = ConfigDict(arbitrary_types_allowed=True)

    def __init__(self, config: LangChainConfig, memory: Optional[BaseMemory] = None):
        super().__init__(chain_type=ChainType.DESIGN, config=config, memory=memory)
        self.designer = ChallengeDesignerAgent(config)
        
    async def _acall(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Execute the design chain"""
        self._validate_inputs(inputs)
        
        # Extract requirements
        requirements = inputs["input"]
        
        # Run the designer agent
        raw_result = await self.designer.run({
            "prompt": requirements.get("prompt", ""),
            "track": requirements.get("track"),
            "difficulty": requirements.get("difficulty"),
            "task": "Design a complete CTF challenge based on the given requirements"
        })
        # Normalize output
        result_payload = raw_result.get("output", raw_result)
        if isinstance(result_payload, str):
            try:
                parsed = json.loads(result_payload)
            except Exception:
                parsed = {"raw": result_payload}
        else:
            parsed = result_payload
        
        # Validate and return results
        output = {"output": parsed}
        self._validate_outputs(output)
        return output
