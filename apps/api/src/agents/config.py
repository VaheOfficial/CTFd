from pydantic import BaseModel, Field
from typing import List, Optional
import os


class AgentConfig(BaseModel):
    """Configuration for OpenAI agent system."""
    
    # Model settings
    model: str = Field(default="gpt-5")
    temperature: float = Field(default=1.0, ge=0.0, le=2.0)
    max_tokens: Optional[int] = Field(default=None)
    
    # Agent behavior
    max_iterations: int = Field(default=20, ge=1, le=50)
    enable_web_search: bool = Field(default=False)
    enable_file_upload: bool = Field(default=True)
    
    # Workspace settings
    workspace_root: str = Field(default="/tmp/ctf_challenges")
    
    # Safety settings - allow all commands except forbidden patterns
    allowed_commands: List[str] = Field(default_factory=lambda: [])
    forbidden_patterns: List[str] = Field(default_factory=lambda: [
        "sudo", "rm -rf", "dd if=", "mkfs", "fdisk", "nc", "netcat"
    ])

    # Package installation controls
    allow_system_installs: bool = Field(default=False, description="Allow installing system packages via a dedicated tool")
    system_package_manager: str = Field(default="apt-get", description="System package manager: apt-get | yum | apk")
    system_install_allowlist: List[str] = Field(default_factory=lambda: [
        "build-essential", "python3", "python3-pip", "python3-venv", "python3-dev",
        "gcc", "g++", "make", "git", "curl", "wget", "ca-certificates"
    ])
    dry_run_installs: bool = Field(default=False, description="If true, do not actually install, only report commands")

    allow_pip_installs: bool = Field(default=True, description="Allow installing pip packages via a dedicated tool")
    pip_install_allowlist: List[str] = Field(default_factory=lambda: [])
    create_venv_per_workspace: bool = Field(default=True)
    venv_dir_name: str = Field(default=".venv")
    pip_install_timeout_sec: int = Field(default=600)
    
    # OpenAI API settings
    api_key: str = Field(default_factory=lambda: os.getenv("OPENAI_API_KEY", ""))
    base_url: str = Field(default="https://api.openai.com/v1")
    
    class Config:
        env_prefix = "AGENT_"
