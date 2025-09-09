"""
Validation chain for testing and verifying CTF challenges.
"""
from typing import Dict, Any, List, Optional
from typing import Any as _Any
from langchain.chains import LLMChain
from langchain.prompts import ChatPromptTemplate
from langchain.schema import BaseMemory
from pydantic import ConfigDict

from .base import BaseGenerationChain
from ..config import ChainType, LangChainConfig
from ..validation_agent import ValidationAgent

class ValidationChain(BaseGenerationChain):
    """Chain for coordinating challenge validation"""
    
    validator: Optional[_Any] = None

    model_config = ConfigDict(arbitrary_types_allowed=True)

    def __init__(self, config: LangChainConfig, memory: Optional[BaseMemory] = None):
        super().__init__(chain_type=ChainType.VALIDATION, config=config, memory=memory)
        self.validator = ValidationAgent(config)
        
    async def _acall(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Execute the validation chain"""
        self._validate_inputs(inputs)
        
        # Extract challenge implementation
        challenge = inputs["input"]
        
        # Run validation
        validation_raw = await self.validator.run({
            "challenge_implementation": challenge.get("implementation"),
            "solution_path": challenge.get("solution_path", []),
            "task": "Validate this CTF challenge implementation"
        })
        validation_payload = validation_raw.get("output", validation_raw)
        if isinstance(validation_payload, str):
            try:
                import json
                validation_parsed = json.loads(validation_payload)
            except Exception:
                validation_parsed = {"raw": validation_payload}
        else:
            validation_parsed = validation_payload
        
        # If validation fails, we might want to trigger a fix
        if not validation_parsed.get("is_valid", False):
            # TODO: Implement fix chain
            pass
        
        output = {"output": validation_parsed}
        self._validate_outputs(output)
        return output
