"""
Documentation chain for generating write-ups and hints.
"""
from typing import Dict, Any, Optional
from typing import Any as _Any
from langchain.chains import LLMChain
from langchain.prompts import ChatPromptTemplate
from .base import BaseGenerationChain
from ..config import ChainType, LangChainConfig
from ..templates import writeup_template, hints_template
from langchain.schema import BaseMemory
from pydantic import ConfigDict

class DocumentationChain(BaseGenerationChain):
    """Chain for generating official write-up and progressive hints."""

    model_config = ConfigDict(arbitrary_types_allowed=True)
    # No sub-agents stored here, but keep extensibility

    def __init__(self, config: LangChainConfig, memory: Optional[BaseMemory] = None):
        super().__init__(chain_type=ChainType.DOCUMENTATION, config=config, memory=memory)

    async def _acall(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        self._validate_inputs(inputs)

        payload = inputs["input"]

        llm = self.config.get_llm()

        writeup_chain = LLMChain(llm=llm, prompt=writeup_template)
        hints_chain = LLMChain(llm=llm, prompt=hints_template)

        writeup = await writeup_chain.arun({
            "title": payload.get("title"),
            "description": payload.get("description"),
            "track": str(payload.get("track")),
            "difficulty": str(payload.get("difficulty")),
            "solution_path": payload.get("solution_path"),
            "implementation": payload.get("implementation")
        })

        hints = await hints_chain.arun({
            "title": payload.get("title"),
            "description": payload.get("description"),
            "difficulty": str(payload.get("difficulty")),
            "solution_path": payload.get("solution_path")
        })

        output = {"output": {"writeup": writeup, "hints": hints}}
        self._validate_outputs(output)
        return output


