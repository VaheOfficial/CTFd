"""
Tool implementations for the OpenAI agent system.
"""
import os
import json
import subprocess
import tempfile
import logging
import shutil
import shlex
from typing import Dict, Any, List, Optional, Tuple
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

        # Conditionally expose install tools
        tools.append({
            "type": "function",
            "function": {
                "name": "install_system_packages",
                "description": "Install system packages via apt-get/yum/apk with safety checks and optional dry-run",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "packages": {"type": "array", "items": {"type": "string"}},
                        "manager": {"type": "string", "enum": ["apt-get", "yum", "apk"], "description": "Override package manager"},
                        "update_index": {"type": "boolean", "default": True},
                        "assume_yes": {"type": "boolean", "default": True},
                        "extra_flags": {"type": "string", "description": "Extra flags to pass to the package manager"},
                        "dry_run": {"type": "boolean", "description": "Return planned commands without executing"}
                    },
                    "required": ["packages"],
                    "additionalProperties": False
                }
            }
        })

        tools.append({
            "type": "function",
            "function": {
                "name": "install_pip_packages",
                "description": "Install pip packages using per-workspace virtualenv; from list or requirements.txt",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "packages": {"type": "array", "items": {"type": "string"}, "description": "Package specifiers, e.g., fastapi==0.115.0"},
                        "requirements_path": {"type": "string", "description": "Relative path to requirements.txt in workspace"},
                        "upgrade": {"type": "boolean", "default": False},
                        "index_url": {"type": "string"},
                        "extra_index_urls": {"type": "array", "items": {"type": "string"}},
                        "editable": {"type": "boolean", "default": False},
                        "create_venv": {"type": "boolean", "description": "Create venv if missing (overrides config)"},
                        "working_dir": {"type": "string", "description": "Working directory relative to workspace"},
                        "dry_run": {"type": "boolean", "description": "Return planned command without executing"}
                    },
                    "additionalProperties": False
                }
            }
        })

        tools.append({
            "type": "function",
            "function": {
                "name": "request_user_input",
                "description": "Request input from the user (file or text). The agent will pause until the user responds.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "prompt": {"type": "string", "description": "What to ask the user"},
                        "kind": {"type": "string", "enum": ["file", "text"], "description": "Type of input requested"},
                        "hint": {"type": "string", "description": "Optional hint to show the user"},
                        "accept_mime": {"type": "array", "items": {"type": "string"}, "description": "Accepted MIME types for file"},
                        "suggested_filename": {"type": "string", "description": "Suggested filename if creating a new file"},
                        "context": {
                            "type": "object",
                            "description": "Additional context to help the user provide exactly what is needed",
                            "properties": {
                                "spec": {"type": "string", "description": "Exact specification (e.g., size, format, constraints)"},
                                "format": {"type": "string", "description": "Expected format (e.g., png, jpg, json, csv)"},
                                "dimensions": {"type": "string", "description": "Dimensions for images/media (e.g., 512x512)"},
                                "example_text": {"type": "string", "description": "Short textual example of desired content"},
                                "preview_b64": {"type": "string", "description": "Optional base64-encoded small preview (keep under 100KB)"},
                                "preview_mime": {"type": "string", "description": "MIME type for preview_b64 (e.g., image/png)"},
                                "notes": {"type": "string", "description": "Any additional notes or constraints"}
                            },
                            "additionalProperties": False
                        }
                    },
                    "required": ["prompt", "kind"],
                    "additionalProperties": False
                }
            }
        })
        
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
            elif name == "install_system_packages":
                return self._install_system_packages(**arguments)
            elif name == "install_pip_packages":
                return self._install_pip_packages(**arguments)
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
            # Auto-use workspace virtualenv if present
            env = {**os.environ}
            venv_bin, venv_path = self._get_workspace_venv_bin()
            if venv_bin:
                env["PATH"] = f"{venv_bin}:{env.get('PATH','')}"
                env["VIRTUAL_ENV"] = str(venv_path)
                env.setdefault("PIP_DISABLE_PIP_VERSION_CHECK", "1")
                env.setdefault("PYTHONUNBUFFERED", "1")

            result = subprocess.run(
                command,
                shell=True,
                cwd=str(work_path),
                capture_output=True,
                text=True,
                timeout=300,  # 5 minute timeout
                env={**env, "PWD": str(work_path)}
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

    # -------------------- Install tools --------------------
    def _get_workspace_venv_bin(self) -> Tuple[Optional[str], Optional[Path]]:
        """Return (bin_path, venv_path) for workspace venv if exists, else (None, None)."""
        venv_dir = self.workspace_root / self.config.venv_dir_name
        if venv_dir.exists() and venv_dir.is_dir():
            bin_dir = venv_dir / ("Scripts" if os.name == "nt" else "bin")
            if bin_dir.exists():
                return str(bin_dir), venv_dir
        return None, None

    def _ensure_workspace_venv(self) -> Tuple[Optional[str], Optional[Path], Optional[str]]:
        """Ensure a per-workspace venv exists if configured. Returns (bin_path, venv_path, error)."""
        try:
            venv_dir = self.workspace_root / self.config.venv_dir_name
            if venv_dir.exists():
                bin_dir = venv_dir / ("Scripts" if os.name == "nt" else "bin")
                return (str(bin_dir) if bin_dir.exists() else None, venv_dir, None)
            if not self.config.create_venv_per_workspace:
                return None, None, None
            # Create venv
            python_exe = shutil.which("python3") or shutil.which("python")
            if not python_exe:
                return None, None, "No python interpreter found to create virtualenv"
            venv_dir.mkdir(parents=True, exist_ok=True)
            result = subprocess.run([
                python_exe, "-m", "venv", str(venv_dir)
            ], capture_output=True, text=True)
            if result.returncode != 0:
                return None, None, f"Failed to create venv: {result.stderr[:300]}"
            bin_dir = venv_dir / ("Scripts" if os.name == "nt" else "bin")
            return (str(bin_dir) if bin_dir.exists() else None, venv_dir, None)
        except Exception as e:
            return None, None, str(e)

    def _detect_package_manager(self, override: Optional[str]) -> Tuple[Optional[str], Optional[str]]:
        """Detect available package manager. Returns (manager, error)."""
        candidates = []
        if override:
            candidates = [override]
        else:
            candidates = [self.config.system_package_manager, "apt-get", "yum", "apk"]
        for cand in candidates:
            if cand and shutil.which(cand):
                return cand, None
        return None, "No supported package manager found (apt-get/yum/apk)"

    def _install_system_packages(
        self,
        packages: List[str],
        manager: Optional[str] = None,
        update_index: bool = True,
        assume_yes: bool = True,
        extra_flags: Optional[str] = None,
        dry_run: Optional[bool] = None
    ) -> Dict[str, Any]:
        """Install system packages with safety checks."""
        if not self.config.allow_system_installs:
            return {"error": "System installs are disabled by configuration"}
        if not packages:
            return {"error": "No packages specified"}

        # Normalize and validate package names
        safe_pkgs: List[str] = []
        for p in packages:
            pkg = str(p).strip()
            if not pkg:
                continue
            if not all(c.isalnum() or c in ".-+_[]<>=!,:;" for c in pkg):
                return {"error": f"Invalid package name: {pkg}"}
            safe_pkgs.append(pkg)
        if not safe_pkgs:
            return {"error": "No valid packages after validation"}

        # Enforce allowlist if configured
        if self.config.system_install_allowlist:
            not_allowed = [p for p in safe_pkgs if p not in self.config.system_install_allowlist]
            if not_allowed:
                return {"error": f"Packages not allowed by allowlist: {', '.join(not_allowed)}"}

        mgr, err = self._detect_package_manager(manager)
        if err:
            return {"error": err}

        flags = extra_flags or ""
        commands: List[str] = []
        if mgr == "apt-get":
            if update_index:
                commands.append("apt-get update")
            install_cmd = f"apt-get install{' -y' if assume_yes else ''} {flags} " + " ".join(shlex.quote(p) for p in safe_pkgs)
            commands.append(install_cmd)
        elif mgr == "yum":
            if update_index:
                commands.append(f"yum makecache{' -y' if assume_yes else ''}")
            install_cmd = f"yum install{' -y' if assume_yes else ''} {flags} " + " ".join(shlex.quote(p) for p in safe_pkgs)
            commands.append(install_cmd)
        elif mgr == "apk":
            if update_index:
                commands.append("apk update")
            install_cmd = f"apk add --no-cache {flags} " + " ".join(shlex.quote(p) for p in safe_pkgs)
            commands.append(install_cmd)
        else:
            return {"error": f"Unsupported package manager: {mgr}"}

        do_dry = self.config.dry_run_installs or bool(dry_run)
        if do_dry:
            return {
                "success": True,
                "dry_run": True,
                "manager": mgr,
                "planned_commands": commands
            }

        stdouts: List[str] = []
        stderrs: List[str] = []
        codes: List[int] = []
        for cmd in commands:
            logger.info(f"System install running: {cmd}")
            proc = subprocess.run(cmd, shell=True, text=True, capture_output=True, cwd=str(self.workspace_root))
            stdouts.append(proc.stdout[:10000])
            stderrs.append(proc.stderr[:10000])
            codes.append(proc.returncode)
            if proc.returncode != 0:
                break

        return {
            "success": all(c == 0 for c in codes),
            "manager": mgr,
            "commands": commands,
            "returncodes": codes,
            "stdout": "\n".join(stdouts)[:20000],
            "stderr": "\n".join(stderrs)[:20000],
        }

    def _install_pip_packages(
        self,
        packages: Optional[List[str]] = None,
        requirements_path: Optional[str] = None,
        upgrade: bool = False,
        index_url: Optional[str] = None,
        extra_index_urls: Optional[List[str]] = None,
        editable: bool = False,
        create_venv: Optional[bool] = None,
        working_dir: Optional[str] = None,
        dry_run: Optional[bool] = None
    ) -> Dict[str, Any]:
        """Install pip packages in a per-workspace virtualenv."""
        if not self.config.allow_pip_installs:
            return {"error": "Pip installs are disabled by configuration"}

        if not packages and not requirements_path:
            return {"error": "Provide either 'packages' or 'requirements_path'"}

        work_path = self._validate_path(working_dir) if working_dir else self.workspace_root

        # Ensure or locate venv
        ensure = self.config.create_venv_per_workspace if create_venv is None else create_venv
        venv_bin, venv_path, venv_err = (None, None, None)
        if ensure:
            venv_bin, venv_path, venv_err = self._ensure_workspace_venv()
            if venv_err:
                return {"error": venv_err}
        else:
            venv_bin, venv_path = self._get_workspace_venv_bin()

        # Determine python/pip executables
        if venv_bin:
            python_exe = str(Path(venv_bin) / ("python.exe" if os.name == "nt" else "python"))
            pip_cmd = [python_exe, "-m", "pip"]
        else:
            # No venv; fallback to system pip
            python_exe = shutil.which("python3") or shutil.which("python")
            if not python_exe:
                return {"error": "No python interpreter found to run pip"}
            pip_cmd = [python_exe, "-m", "pip"]

        args: List[str] = []
        if requirements_path:
            req_path = self._validate_path(requirements_path)
            if not req_path.exists() or not req_path.is_file():
                return {"error": f"requirements file not found: {requirements_path}"}
            args = ["install", "-r", str(req_path)]
        else:
            safe_packages: List[str] = []
            for spec in packages or []:
                s = str(spec).strip()
                if not s:
                    continue
                if not all(c.isalnum() or c in ".-+_[]<>=!,:;@/" for c in s):
                    return {"error": f"Invalid package specifier: {s}"}
                safe_packages.append(s)
            if not safe_packages:
                return {"error": "No valid package specifiers"}
            # Allowlist enforcement if configured
            if self.config.pip_install_allowlist:
                not_allowed = [p for p in safe_packages if p.split("==")[0] not in self.config.pip_install_allowlist]
                if not_allowed:
                    return {"error": f"Packages not allowed by allowlist: {', '.join(not_allowed)}"}
            args = ["install"] + (["-e"] if editable else []) + safe_packages

        if upgrade:
            args.append("--upgrade")
        if index_url:
            args += ["--index-url", index_url]
        for url in (extra_index_urls or []):
            args += ["--extra-index-url", url]

        planned_cmd_str = " ".join(shlex.quote(a) for a in (pip_cmd + args))
        do_dry = self.config.dry_run_installs or bool(dry_run)
        if do_dry:
            return {
                "success": True,
                "dry_run": True,
                "venv": str(venv_path) if venv_path else None,
                "planned_command": planned_cmd_str
            }

        env = {**os.environ}
        if venv_bin and venv_path:
            env["PATH"] = f"{venv_bin}:{env.get('PATH','')}"
            env["VIRTUAL_ENV"] = str(venv_path)
        env.setdefault("PIP_DISABLE_PIP_VERSION_CHECK", "1")
        env.setdefault("PYTHONUNBUFFERED", "1")

        proc = subprocess.run(
            pip_cmd + args,
            cwd=str(work_path),
            capture_output=True,
            text=True,
            timeout=self.config.pip_install_timeout_sec,
            env=env
        )

        return {
            "success": proc.returncode == 0,
            "returncode": proc.returncode,
            "stdout": proc.stdout[:20000],
            "stderr": proc.stderr[:20000],
            "venv": str(venv_path) if venv_path else None,
            "used_command": planned_cmd_str
        }
