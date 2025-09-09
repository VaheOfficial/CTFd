"""
Shell execution utilities for agents to run local commands.
"""
import subprocess
import shlex
import os
from typing import List, Dict, Any, Optional


def run_command(command: str, cwd: Optional[str] = None, env: Optional[Dict[str, str]] = None, timeout: int = 600) -> Dict[str, Any]:
    """Run a single shell command and capture outputs.

    Returns dict with keys: command, returncode, stdout, stderr, cwd
    """
    proc = subprocess.Popen(
        command,
        cwd=cwd,
        env={**os.environ, **(env or {})},
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        shell=True,
        text=True,
    )
    try:
        stdout, stderr = proc.communicate(timeout=timeout)
    except subprocess.TimeoutExpired:
        proc.kill()
        stdout, stderr = proc.communicate()
        return {
            "command": command,
            "returncode": -1,
            "stdout": stdout,
            "stderr": f"Timeout after {timeout}s\n" + (stderr or ""),
            "cwd": cwd,
        }
    return {
        "command": command,
        "returncode": proc.returncode,
        "stdout": stdout,
        "stderr": stderr,
        "cwd": cwd,
    }


def run_commands(commands: List[str], cwd: Optional[str] = None, env: Optional[Dict[str, str]] = None, timeout_per_cmd: int = 600) -> List[Dict[str, Any]]:
    """Run multiple commands sequentially and return list of results."""
    results: List[Dict[str, Any]] = []
    for cmd in commands:
        results.append(run_command(cmd, cwd=cwd, env=env, timeout=timeout_per_cmd))
        if results[-1]["returncode"] != 0:
            break
    return results


