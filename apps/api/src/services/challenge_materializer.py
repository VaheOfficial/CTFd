"""
Service to materialize agent-generated challenges into the database and file system.
"""
import os
import hashlib
import shutil
from typing import Dict, Any, List
from pathlib import Path
from sqlalchemy.orm import Session

from ..models.challenge import Challenge, Artifact, Hint, ArtifactKind, FlagType, ChallengeStatus
from ..utils.logging import get_logger

logger = get_logger(__name__)


class ChallengeMaterializer:
    """Converts agent workspace into proper database records and artifacts."""
    
    def __init__(self, db: Session, storage_root: str = "/app/storage/artifacts"):
        self.db = db
        self.storage_root = Path(storage_root)
        self.storage_root.mkdir(parents=True, exist_ok=True)
    
    async def materialize_challenge(self, challenge_id: str, workspace_dir: str, agent_result: Dict[str, Any]) -> Dict[str, Any]:
        """Convert agent workspace to database records and move artifacts to storage."""
        
        logger.info(f"Materializing challenge {challenge_id} from workspace {workspace_dir}")
        workspace_path = Path(workspace_dir)
        
        if not workspace_path.exists():
            raise ValueError(f"Workspace directory does not exist: {workspace_dir}")
        
        # Get challenge from database
        challenge = self.db.query(Challenge).filter(Challenge.id == challenge_id).first()
        if not challenge:
            raise ValueError(f"Challenge {challenge_id} not found in database")
        
        materialization_result = {
            "artifacts_created": [],
            "hints_created": [],
            "flag_configured": False,
            "challenge_files": [],
            "errors": []
        }
        
        try:
            # 1. Find and upload challenge artifacts
            artifacts_created = await self._process_artifacts(challenge, workspace_path)
            materialization_result["artifacts_created"] = artifacts_created
            
            # 2. Extract and configure flag
            flag_configured = await self._configure_flag(challenge, workspace_path, agent_result)
            materialization_result["flag_configured"] = flag_configured
            
            # 3. Create hints if available
            hints_created = await self._create_hints(challenge, agent_result)
            materialization_result["hints_created"] = hints_created
            
            # 4. Update challenge status to PUBLISHED so it appears on frontend
            challenge.status = ChallengeStatus.PUBLISHED
            
            # 5. List all files created for reference
            materialization_result["challenge_files"] = [
                str(p.relative_to(workspace_path)) 
                for p in workspace_path.rglob("*") 
                if p.is_file()
            ]
            
            self.db.commit()
            logger.info(f"Challenge {challenge_id} materialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to materialize challenge {challenge_id}: {str(e)}")
            materialization_result["errors"].append(str(e))
            self.db.rollback()
            raise
        
        return materialization_result
    
    async def _process_artifacts(self, challenge: Challenge, workspace_path: Path) -> List[Dict[str, Any]]:
        """Find challenge artifacts and upload them to storage."""
        artifacts_created = []
        
        # Look for common challenge artifact patterns
        artifact_patterns = [
            "challenge/*.jpg", "challenge/*.jpeg", "challenge/*.png",
            "challenge/*.zip", "challenge/*.tar.gz", "challenge/*.pcap",
            "dist/*", "build/*", "artifacts/*"
        ]
        
        for pattern in artifact_patterns:
            for artifact_path in workspace_path.glob(pattern):
                if artifact_path.is_file():
                    logger.info(f"Processing artifact: {artifact_path}")
                    
                    # Calculate hash
                    with open(artifact_path, 'rb') as f:
                        content = f.read()
                        sha256_hash = hashlib.sha256(content).hexdigest()
                    
                    # Determine artifact kind
                    kind = self._determine_artifact_kind(artifact_path)
                    
                    # Copy to storage
                    storage_key = f"challenges/{challenge.id}/{artifact_path.name}"
                    storage_path = self.storage_root / storage_key
                    storage_path.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(artifact_path, storage_path)
                    
                    # Create database record
                    artifact = Artifact(
                        challenge_id=challenge.id,
                        s3_key=storage_key,
                        sha256=sha256_hash,
                        size_bytes=len(content),
                        kind=kind,
                        original_filename=artifact_path.name
                    )
                    self.db.add(artifact)
                    
                    artifacts_created.append({
                        "path": str(artifact_path.relative_to(workspace_path)),
                        "storage_key": storage_key,
                        "kind": kind.value,
                        "size": len(content),
                        "sha256": sha256_hash
                    })
        
        return artifacts_created
    
    def _determine_artifact_kind(self, path: Path) -> ArtifactKind:
        """Determine artifact kind from file extension."""
        suffix = path.suffix.lower()
        if suffix in ['.jpg', '.jpeg', '.png', '.gif', '.bmp']:
            return ArtifactKind.IMAGE
        elif suffix in ['.zip', '.tar', '.tar.gz', '.rar']:
            return ArtifactKind.ARCHIVE
        elif suffix in ['.pcap', '.pcapng']:
            return ArtifactKind.PCAP
        elif suffix in ['.txt', '.md', '.pdf']:
            return ArtifactKind.DOCUMENT
        else:
            return ArtifactKind.OTHER
    
    async def _configure_flag(self, challenge: Challenge, workspace_path: Path, agent_result: Dict[str, Any]) -> bool:
        """Configure the challenge flag."""
        
        # Look for flag in agent result
        flag_info = agent_result.get("flag", {})
        if isinstance(flag_info, dict) and flag_info.get("format"):
            flag_value = flag_info["format"]
            logger.info(f"Found flag in agent result: {flag_value}")
            
            challenge.flag_type = FlagType.STATIC
            challenge.static_flag = flag_value
            challenge.flag_format = "flag{{{}}}"  # Standard format
            return True
        
        # Look for flag.txt in workspace
        flag_file = workspace_path / "flag.txt"
        if flag_file.exists():
            flag_value = flag_file.read_text().strip()
            logger.info(f"Found flag in flag.txt: {flag_value}")
            
            challenge.flag_type = FlagType.STATIC
            challenge.static_flag = flag_value
            challenge.flag_format = "flag{{{}}}"
            return True
        
        # Look for flag in file contents
        for file_path in workspace_path.rglob("*.py"):
            try:
                content = file_path.read_text()
                if "CTF{" in content:
                    import re
                    flag_match = re.search(r'CTF\{[^}]+\}', content)
                    if flag_match:
                        flag_value = flag_match.group(0)
                        logger.info(f"Found flag in {file_path}: {flag_value}")
                        
                        challenge.flag_type = FlagType.STATIC
                        challenge.static_flag = flag_value
                        challenge.flag_format = "flag{{{}}}"
                        return True
            except:
                continue
        
        logger.warning("No flag found in agent result or workspace")
        return False
    
    async def _create_hints(self, challenge: Challenge, agent_result: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Create hints from agent result."""
        hints_created = []
        
        # Look for hints in agent conversation or result
        conversation_log = agent_result.get("conversation_log", [])
        
        # Generate basic hints based on challenge type
        if challenge.track.value == "DETECT_FORENSICS":
            hint_texts = [
                "Look beyond the pixels - examine the image's metadata and embedded information.",
                "Use tools like exiftool, strings, or image analysis libraries to inspect hidden data.",
                "Check EXIF data, PNG text chunks, or other metadata fields where information can be stored."
            ]
        else:
            hint_texts = [
                "Analyze the challenge files carefully for hidden information.",
                "Consider using appropriate tools for the challenge category.",
                "Think about common hiding places for flags in this type of challenge."
            ]
        
        for i, hint_text in enumerate(hint_texts):
            hint = Hint(
                challenge_id=challenge.id,
                order=i + 1,
                text=hint_text,
                cost_percent=10 * (i + 1)  # 10%, 20%, 30%
            )
            self.db.add(hint)
            hints_created.append({
                "order": i + 1,
                "text": hint_text,
                "cost_percent": 10 * (i + 1)
            })
        
        return hints_created
