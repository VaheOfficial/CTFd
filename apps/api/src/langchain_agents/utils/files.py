"""
File system helper utilities to write generated challenge files to disk.
"""
import os
from typing import List, Dict, Any


def ensure_dir(path: str) -> None:
    os.makedirs(path, exist_ok=True)


def write_files(base_dir: str, files: List[Dict[str, str]]) -> List[str]:
    """Write a list of files with {path, content} under base_dir. Returns absolute paths written."""
    written: List[str] = []
    for f in files:
        rel_path = f.get("path")
        content = f.get("content", "")
        if not rel_path:
            continue
        abs_path = os.path.join(base_dir, rel_path)
        ensure_dir(os.path.dirname(abs_path))
        with open(abs_path, "w", encoding="utf-8") as fp:
            fp.write(content)
        written.append(abs_path)
    return written


