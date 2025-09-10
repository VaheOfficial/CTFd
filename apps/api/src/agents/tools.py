"""
Tool implementations for the OpenAI agent system.
"""
import os
import json
import subprocess
import tempfile
import logging
from typing import Dict, Any, List, Optional
from pathlib import Path

from .config import AgentConfig

logger = logging.getLogger(__name__)


class ToolRegistry:
    """Registry of available tools for the agent."""
    
    def __init__(self, config: AgentConfig):
        self.config = config
        self.workspace_root = Path(config.workspace_root).resolve()
        
    def get_tool_definitions(self) -> List[Dict[str, Any]]:
        """Get OpenAI function definitions for all available tools."""
        tools = [
            {
                "type": "function",
                "function": {
                    "name": "write_file",
                    "description": "Write content to a file in the workspace",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "path": {
                                "type": "string",
                                "description": "Relative path within workspace"
                            },
                            "content": {
                                "type": "string", 
                                "description": "File content to write"
                            }
                        },
                        "required": ["path", "content"],
                        "additionalProperties": False
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "read_file",
                    "description": "Read content from a file in the workspace",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "path": {
                                "type": "string",
                                "description": "Relative path within workspace"
                            },
                            "max_lines": {
                                "type": "integer",
                                "description": "Maximum lines to read (optional)",
                                "minimum": 1,
                                "maximum": 1000
                            }
                        },
                        "required": ["path"],
                        "additionalProperties": False
                    }
                }
            },
            {
                "type": "function", 
                "function": {
                    "name": "execute_shell",
                    "description": "Execute a shell command in the workspace",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "command": {
                                "type": "string",
                                "description": "Shell command to execute"
                            },
                            "working_dir": {
                                "type": "string",
                                "description": "Working directory relative to workspace (optional)"
                            }
                        },
                        "required": ["command"],
                        "additionalProperties": False
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "list_files",
                    "description": "List files and directories in the workspace",
                    "parameters": {
                        "type": "object", 
                        "properties": {
                            "path": {
                                "type": "string",
                                "description": "Directory path to list (optional, defaults to workspace root)"
                            },
                            "recursive": {
                                "type": "boolean",
                                "description": "Whether to list recursively"
                            }
                        },
                        "additionalProperties": False
                    }
                }
            }
        ]
        
        return tools
    
    def execute_tool(self, name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a tool and return the result."""
        logger.debug(f"Executing tool '{name}' with args: {arguments}")
        try:
            if name == "write_file":
                return self._write_file(**arguments)
            elif name == "read_file":
                return self._read_file(**arguments)
            elif name == "execute_shell":
                return self._execute_shell(**arguments)
            elif name == "list_files":
                return self._list_files(**arguments)
            else:
                logger.error(f"Unknown tool: {name}")
                return {"error": f"Unknown tool: {name}"}
        except Exception as e:
            logger.error(f"Tool '{name}' execution failed: {str(e)}")
            return {"error": f"Tool execution failed: {str(e)}"}
    
    def _validate_path(self, path: str) -> Path:
        """Validate and resolve a path within the workspace."""
        if not path:
            raise ValueError("Path cannot be empty")
        
        # Resolve relative to workspace
        full_path = (self.workspace_root / path).resolve()
        
        # Ensure it's within workspace (prevent path traversal)
        try:
            full_path.relative_to(self.workspace_root)
        except ValueError:
            raise ValueError(f"Path {path} is outside workspace")
            
        return full_path
    
    def _write_file(self, path: str, content: str) -> Dict[str, Any]:
        """Write content to a file."""
        full_path = self._validate_path(path)
        
        logger.info(f"Writing file: {path} ({len(content)} bytes)")
        logger.debug(f"File content preview: {content[:100]}{'...' if len(content) > 100 else ''}")
        
        # Create parent directories
        full_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Write file
        full_path.write_text(content, encoding='utf-8')
        
        # Make executable if it's a script
        if full_path.suffix in ['.py', '.sh'] or content.startswith('#!'):
            full_path.chmod(0o755)
            logger.debug(f"Made {path} executable")
        
        return {
            "success": True,
            "path": str(full_path.relative_to(self.workspace_root)),
            "size": len(content)
        }
    
    def _read_file(self, path: str, max_lines: Optional[int] = None) -> Dict[str, Any]:
        """Read content from a file."""
        full_path = self._validate_path(path)
        
        if not full_path.exists():
            return {"error": f"File {path} does not exist"}
        
        if not full_path.is_file():
            return {"error": f"Path {path} is not a file"}
        
        try:
            content = full_path.read_text(encoding='utf-8')
            
            if max_lines:
                lines = content.split('\n')
                if len(lines) > max_lines:
                    content = '\n'.join(lines[:max_lines])
                    content += f"\n... (truncated, {len(lines)} total lines)"
            
            return {
                "success": True,
                "path": path,
                "content": content,
                "size": full_path.stat().st_size
            }
        except UnicodeDecodeError:
            return {"error": f"File {path} is not text (binary file)"}
    
    def _execute_shell(self, command: str, working_dir: Optional[str] = None) -> Dict[str, Any]:
        """Execute a shell command."""
        logger.info(f"Executing shell command: {command}")
        if working_dir:
            logger.info(f"Working directory: {working_dir}")
        
        # Validate command against safety rules
        for forbidden in self.config.forbidden_patterns:
            if forbidden in command:
                logger.warning(f"Command blocked - contains forbidden pattern: {forbidden}")
                return {"error": f"Command contains forbidden pattern: {forbidden}"}
        
        # Check if command starts with allowed command (if allowlist is configured)
        if self.config.allowed_commands:  # Only check if allowlist exists
            cmd_parts = command.split()
            if cmd_parts and not any(cmd_parts[0].startswith(allowed) for allowed in self.config.allowed_commands):
                logger.warning(f"Command blocked - '{cmd_parts[0]}' not in allowed commands")
                return {"error": f"Command '{cmd_parts[0]}' is not allowed"}
        
        # Determine working directory
        if working_dir:
            work_path = self._validate_path(working_dir)
            if not work_path.exists():
                work_path.mkdir(parents=True, exist_ok=True)
        else:
            work_path = self.workspace_root
        
        try:
            result = subprocess.run(
                command,
                shell=True,
                cwd=str(work_path),
                capture_output=True,
                text=True,
                timeout=300,  # 5 minute timeout
                env={**os.environ, "PWD": str(work_path)}
            )
            
            logger.info(f"Command completed - Return code: {result.returncode}")
            if result.stdout:
                logger.info(f"Command stdout: {result.stdout[:200]}{'...' if len(result.stdout) > 200 else ''}")
            if result.stderr:
                logger.warning(f"Command stderr: {result.stderr[:200]}{'...' if len(result.stderr) > 200 else ''}")
            
            return {
                "success": True,
                "command": command,
                "returncode": result.returncode,
                "stdout": result.stdout[:10000],  # Limit output
                "stderr": result.stderr[:10000],
                "working_dir": str(work_path.relative_to(self.workspace_root))
            }
            
        except subprocess.TimeoutExpired:
            return {"error": "Command timed out after 5 minutes"}
        except Exception as e:
            return {"error": f"Command execution failed: {str(e)}"}
    
    def _list_files(self, path: Optional[str] = None, recursive: bool = False) -> Dict[str, Any]:
        """List files in a directory."""
        if path:
            list_path = self._validate_path(path)
        else:
            list_path = self.workspace_root
        
        if not list_path.exists():
            return {"error": f"Path {path or '.'} does not exist"}
        
        if not list_path.is_dir():
            return {"error": f"Path {path or '.'} is not a directory"}
        
        try:
            files = []
            dirs = []
            
            if recursive:
                for item in list_path.rglob('*'):
                    rel_path = str(item.relative_to(self.workspace_root))
                    if item.is_file():
                        files.append({
                            "path": rel_path,
                            "size": item.stat().st_size,
                            "type": "file"
                        })
                    elif item.is_dir():
                        dirs.append({
                            "path": rel_path,
                            "type": "directory"
                        })
            else:
                for item in list_path.iterdir():
                    rel_path = str(item.relative_to(self.workspace_root))
                    if item.is_file():
                        files.append({
                            "path": rel_path,
                            "size": item.stat().st_size,
                            "type": "file"
                        })
                    elif item.is_dir():
                        dirs.append({
                            "path": rel_path,
                            "type": "directory"
                        })
            
            return {
                "success": True,
                "path": str(list_path.relative_to(self.workspace_root)) if path else ".",
                "files": sorted(files, key=lambda x: x["path"]),
                "directories": sorted(dirs, key=lambda x: x["path"])
            }
            
        except Exception as e:
            return {"error": f"Failed to list directory: {str(e)}"}
