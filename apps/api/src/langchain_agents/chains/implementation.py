"""
Implementation chain for coordinating challenge code generation and vulnerability implementation.
"""
from typing import Dict, Any, List, Optional
from typing import Any as _Any
from langchain.chains import LLMChain
from langchain.prompts import ChatPromptTemplate
import json
from langchain.schema import BaseMemory
from pydantic import ConfigDict
import os
from ..utils.files import write_files, ensure_dir
from ..utils.shell import run_commands

from .base import BaseGenerationChain
from ..config import ChainType, LangChainConfig
from ..code_generator import CodeGeneratorAgent
from ..vulnerability_creator import VulnerabilityCreatorAgent

class ImplementationChain(BaseGenerationChain):
    """Chain for coordinating challenge implementation"""
    
    code_generator: Optional[_Any] = None
    vulnerability_creator: Optional[_Any] = None

    model_config = ConfigDict(arbitrary_types_allowed=True)

    def __init__(self, config: LangChainConfig, memory: Optional[BaseMemory] = None):
        super().__init__(chain_type=ChainType.IMPLEMENTATION, config=config, memory=memory)
        self.code_generator = CodeGeneratorAgent(config)
        self.vulnerability_creator = VulnerabilityCreatorAgent(config)
        
    async def _acall(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Execute the implementation chain"""
        self._validate_inputs(inputs)
        
        # Extract design
        design = inputs["input"]
        
        # Step 1: Generate core functionality
        raw_code_result = await self.code_generator.run({
            "challenge_design": design,
            "task": "Implement the core functionality for this CTF challenge"
        })
        code_payload = raw_code_result.get("output", raw_code_result)
        if isinstance(code_payload, str):
            try:
                code_parsed = json.loads(code_payload)
            except Exception:
                code_parsed = {"raw": code_payload}
        else:
            code_parsed = code_payload
        
        # Step 2: Implement vulnerabilities
        raw_vuln_result = await self.vulnerability_creator.run({
            "challenge_code": code_parsed,
            "vulnerability_requirements": design.get("solution_path"),
            "task": "Implement the required vulnerabilities in the challenge code"
        })
        vuln_payload = raw_vuln_result.get("output", raw_vuln_result)
        if isinstance(vuln_payload, str):
            try:
                vuln_parsed = json.loads(vuln_payload)
            except Exception:
                vuln_parsed = {"raw": vuln_payload}
        else:
            vuln_parsed = vuln_payload
        
        # Materialize files to workspace under a build directory
        workspace_dir = os.path.join(self.config.local_deployment_path, "generated_challenge")
        ensure_dir(workspace_dir)
        # Generated core files
        code_files = code_parsed.get("files", []) if isinstance(code_parsed, dict) else []
        # Vulnerability modifications may add/replace files
        vuln_files = vuln_parsed.get("files", []) if isinstance(vuln_parsed, dict) else []
        written_paths = write_files(workspace_dir, code_files + vuln_files)

        # Attempt to build artifacts if a Makefile or build script exists
        build_results = []
        if os.path.exists(os.path.join(workspace_dir, "Makefile")):
            build_results = run_commands(["make build"], cwd=workspace_dir)
        elif any(os.path.basename(p) == "build_artifact.py" for p in written_paths):
            build_results = run_commands(["python challenge/build_artifact.py"], cwd=workspace_dir)

        # Combine results
        output = {
            "output": {
                "implementation": code_parsed,
                "vulnerabilities": vuln_parsed,
                "solution_path": design.get("solution_path"),
                "workspace_dir": workspace_dir,
                "written_files": written_paths,
                "build_results": build_results
            }
        }
        
        self._validate_outputs(output)
        return output
