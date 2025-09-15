"""
Service to materialize agent-generated challenges into the database and object storage.
"""
import os
import hashlib
from typing import Dict, Any, List
from pathlib import Path
from sqlalchemy.orm import Session
import boto3
from botocore.config import Config

from ..models.challenge import Challenge, Artifact, Hint, ArtifactKind, FlagType, ChallengeStatus
from ..utils.logging import get_logger

logger = get_logger(__name__)


class ChallengeMaterializer:
    """Converts agent workspace into proper database records and artifacts."""
    
    def __init__(self, db: Session, storage_root: str = None):
        self.db = db
        # Local storage (optional cache; key space mirrors S3 keys)
        default_storage = os.getenv("ARTIFACTS_DIR") or os.path.join(
            os.getenv("XDG_CACHE_HOME", os.path.expanduser("~/.cache")),
            "cte", "artifacts"
        )
        self.storage_root = Path(storage_root or default_storage)
        self.storage_root.mkdir(parents=True, exist_ok=True)
        logger.info(f"Using local artifact cache at: {self.storage_root}")
        
        # S3/MinIO client configuration
        self.s3_endpoint = os.getenv('S3_ENDPOINT', 'http://minio:9000')
        self.s3_access_key = os.getenv('S3_ACCESS_KEY', 'minio')
        self.s3_secret_key = os.getenv('S3_SECRET_KEY', 'minio123')
        self.s3_bucket = os.getenv('S3_BUCKET', 'cte-artifacts')
        s3_disabled = os.getenv('S3_DISABLED', '0') in ['1', 'true', 'True']
        if s3_disabled:
            logger.info("S3 is disabled via S3_DISABLED env.")
            self.s3_client = None
        else:
            try:
                self.s3_client = boto3.client(
                    's3',
                    endpoint_url=self.s3_endpoint,
                    aws_access_key_id=self.s3_access_key,
                    aws_secret_access_key=self.s3_secret_key,
                    config=Config(signature_version='s3v4', s3={'addressing_style': 'path'})
                )
                # Ensure bucket exists
                try:
                    self.s3_client.head_bucket(Bucket=self.s3_bucket)
                except Exception:
                    self.s3_client.create_bucket(Bucket=self.s3_bucket)
            except Exception as e:
                logger.warning(f"S3 client init failed, continuing without S3: {e}")
                self.s3_client = None
    
    async def materialize_challenge(self, challenge_id: str, workspace_dir: str, agent_result: Dict[str, Any]) -> Dict[str, Any]:
        """Convert agent workspace to database records and upload artifacts to S3."""
        
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
            
            # 2. Populate title/description strictly from agent_result (no defaults here)
            try:
                title = agent_result.get("title")
                description = agent_result.get("description")
                if isinstance(title, str) and title.strip():
                    challenge.title = str(title).strip()[:200]
                if isinstance(description, str):
                    challenge.description = str(description).strip()[:2000]
            except Exception:
                pass

            # 3. Extract and configure flag
            flag_configured = await self._configure_flag(challenge, workspace_path, agent_result)
            materialization_result["flag_configured"] = flag_configured
            
            # 4. Create hints if available (single source of truth)
            hints_created = await self._create_hints(challenge, workspace_path, agent_result)
            materialization_result["hints_created"] = hints_created
            
            # 5. Update challenge status to PUBLISHED so it appears on frontend
            challenge.status = ChallengeStatus.PUBLISHED
            
            # 6. List all files created for reference
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
        """Find challenge artifacts and upload them to S3 (MinIO)."""
        artifacts_created = []
        
        # Preferred: explicit deliverables specified by agent
        metadata_file = workspace_path / "challenge.json"
        deliverables_file = workspace_path / "deliverables.json"
        # Try structured metadata first
        if metadata_file.exists():
            try:
                import json
                meta = json.loads(metadata_file.read_text())
                # Title/description only (hints handled centrally later)
                if isinstance(meta.get("title"), str) and meta["title"].strip():
                    try:
                        # Always prefer challenge.json if present
                        challenge.title = meta["title"].strip()[:200]
                    except Exception:
                        pass
                if isinstance(meta.get("description"), str):
                    try:
                        challenge.description = meta["description"].strip()[:2000]
                    except Exception:
                        pass
            except Exception as e:
                logger.warning(f"Failed to parse challenge.json: {e}")
        explicit_artifacts: List[Path] = []
        if deliverables_file.exists():
            try:
                import json
                items = json.loads(deliverables_file.read_text())
                for rel in items.get("artifacts", []):
                    p = (workspace_path / rel).resolve()
                    try:
                        p.relative_to(workspace_path)
                    except Exception:
                        continue
                    if p.is_file():
                        explicit_artifacts.append(p)
                if explicit_artifacts:
                    logger.info(f"Using explicit deliverables from deliverables.json: {[str(p) for p in explicit_artifacts]}")
            except Exception as e:
                logger.warning(f"Failed to parse deliverables.json: {e}")

        # Fallback: search under challenge folder
        artifact_patterns = [
            "challenge/*",
            "challenge/**/*",
        ]

        # Only treat these extensions as uploadable artifacts
        allowed_suffixes = {
            ".png", ".jpg", ".jpeg", ".gif", ".bmp",
            ".pcap", ".pcapng", ".zip", ".csv", ".jsonl", ".ndjson",
            ".eml", ".log", ".bin"
        }

        # Exclude files that should never be uploaded as artifacts
        excluded_basenames = {"flag.txt", "README.txt", "INSTRUCTIONS.txt", "SOLUTION.md"}
        
        candidate_files: List[Path] = []
        if explicit_artifacts:
            candidate_files = explicit_artifacts
        else:
            for pattern in artifact_patterns:
                for artifact_path in workspace_path.glob(pattern):
                    if not artifact_path.is_file():
                        continue
                    if artifact_path.name in excluded_basenames:
                        continue
                    if artifact_path.suffix.lower() not in allowed_suffixes:
                        continue
                    candidate_files.append(artifact_path)

        # Heuristic: if multiple images exist, keep only the first by sorted name
        # This avoids uploading auxiliary files; adjust as needed per track
        candidate_files.sort()

        # For now, only upload a single primary artifact
        for artifact_path in candidate_files[:1]:
            try:
                    logger.info(f"Processing artifact: {artifact_path}")
                    
                    # Calculate hash
                    content = artifact_path.read_bytes()
                    sha256_hash = hashlib.sha256(content).hexdigest()
                    
                    # Determine artifact kind
                    kind = self._determine_artifact_kind(artifact_path)
                    
                    # Use content-addressed S3 key for deduplication
                    s3_key = f"artifacts/{sha256_hash[:2]}/{sha256_hash[2:4]}/{sha256_hash}"
                    
                    # Upload to S3 if missing
                    if self.s3_client is not None:
                        try:
                            self.s3_client.head_object(Bucket=self.s3_bucket, Key=s3_key)
                            logger.info(f"Artifact already exists in S3: {s3_key}")
                        except Exception:
                            try:
                                logger.info(f"Uploading artifact to S3: {s3_key}")
                                self.s3_client.upload_file(str(artifact_path), self.s3_bucket, s3_key)
                            except Exception as e:
                                logger.warning(f"S3 upload failed ({s3_key}): {e}")
                    
                    # Optionally cache locally mirroring S3 key space
                    try:
                        local_path = self.storage_root / s3_key
                        local_path.parent.mkdir(parents=True, exist_ok=True)
                        if not local_path.exists():
                            local_path.write_bytes(content)
                    except Exception:
                        # Best-effort cache; ignore failures
                        pass
                    
                    # Create database record
                    artifact = Artifact(
                        challenge_id=challenge.id,
                        s3_key=s3_key,
                        sha256=sha256_hash,
                        size_bytes=len(content),
                        kind=kind,
                        original_filename=artifact_path.name
                    )
                    self.db.add(artifact)
                    
                    artifacts_created.append({
                        "path": str(artifact_path.relative_to(workspace_path)),
                        "s3_key": s3_key,
                        "kind": kind.value,
                        "size": len(content),
                        "sha256": sha256_hash
                    })
            except Exception as e:
                logger.warning(f"Skipping artifact {artifact_path}: {e}")
        
        return artifacts_created
    
    def _determine_artifact_kind(self, path: Path) -> ArtifactKind:
        """Determine artifact kind from file extension aligned with ArtifactKind enum."""
        suffix = path.suffix.lower()
        if suffix in ['.jpg', '.jpeg', '.png', '.gif', '.bmp']:
            return ArtifactKind.IMAGE
        if suffix in ['.pcap', '.pcapng']:
            return ArtifactKind.PCAP
        if suffix == '.zip':
            return ArtifactKind.ZIP
        if suffix == '.csv':
            return ArtifactKind.CSV
        if suffix in ['.jsonl', '.ndjson']:
            return ArtifactKind.JSONL
        if suffix in ['.eml']:
            return ArtifactKind.EML
        if suffix in ['.log']:
            return ArtifactKind.LOG
        if suffix in ['.bin', '.exe']:
            return ArtifactKind.BIN
        return ArtifactKind.OTHER
    
    async def _configure_flag(self, challenge: Challenge, workspace_path: Path, agent_result: Dict[str, Any]) -> bool:
        """Configure the challenge flag."""
        # 0) Prefer explicit flag metadata from challenge.json/challenges.json
        try:
            for meta_name in ["challenge.json", "challenges.json"]:
                metadata_file = workspace_path / meta_name
                if metadata_file.exists():
                    import json
                    meta = json.loads(metadata_file.read_text(errors="ignore"))
                    flag_meta = meta.get("flag") or meta.get("flags")
                    if isinstance(flag_meta, str) and flag_meta.strip():
                        # Treat plain string as static flag value
                        challenge.flag_type = FlagType.STATIC
                        challenge.static_flag = flag_meta.strip()
                        challenge.flag_format = meta.get("flag_format", "flag{{{}}}")
                        logger.info(f"Using static flag from {meta_name}")
                        return True
                    if isinstance(flag_meta, dict):
                        ftype = str(flag_meta.get("type", "")).lower()
                        fformat = flag_meta.get("format") or meta.get("flag_format") or "flag{{{}}}"
                        if ftype in ("static", FlagType.STATIC.value):
                            # Support several common keys for the raw flag value
                            value = (
                                flag_meta.get("value")
                                or flag_meta.get("static_value")
                                or flag_meta.get("flag")
                            )
                            if isinstance(value, str) and value.strip():
                                challenge.flag_type = FlagType.STATIC
                                challenge.static_flag = value.strip()
                                challenge.flag_format = fformat
                                logger.info(f"Using static flag from {meta_name}")
                                return True
                        if ftype in ("dynamic_hmac", FlagType.DYNAMIC_HMAC.value):
                            challenge.flag_type = FlagType.DYNAMIC_HMAC
                            challenge.static_flag = None
                            challenge.flag_format = fformat
                            logger.info(f"Configured dynamic HMAC flag from {meta_name}")
                            return True
        except Exception as e:
            logger.warning(f"Failed to configure flag from metadata: {e}")

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
        
        # Look for flag in file contents (broadened to common text assets like HTML)
        text_globs = ["*.py", "*.html", "*.htm", "*.txt", "*.md"]
        for pattern in text_globs:
            for file_path in workspace_path.rglob(pattern):
                try:
                    content = file_path.read_text(errors="ignore")
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
                except Exception:
                    continue
        
        logger.warning("No flag found in agent result or workspace")
        return False
    
    async def _create_hints(self, challenge: Challenge, workspace_path: Path, agent_result: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Create hints from agent result."""
        hints_created = []

        # 1) Prefer hints from challenge.json if available
        try:
            metadata_file = workspace_path / "challenge.json"
            if metadata_file.exists():
                import json
                meta = json.loads(metadata_file.read_text())
                if isinstance(meta.get("hints"), list):
                    for existing in list(challenge.hints):
                        self.db.delete(existing)
                    valid_hints = [h for h in meta["hints"] if isinstance(h, str) and h.strip()]
                    for i, hint_text in enumerate(valid_hints):
                        hint = Hint(
                            challenge_id=challenge.id,
                            order=i + 1,
                            text=hint_text.strip()[:2000],
                            cost_percent=10 * (i + 1)
                        )
                        self.db.add(hint)
                        hints_created.append({
                            "order": i + 1,
                            "text": hint_text.strip(),
                            "cost_percent": 10 * (i + 1)
                        })
                    return hints_created
        except Exception:
            pass

        # 2) Otherwise, use explicit hints from agent_result exactly as provided
        explicit_hints = agent_result.get("hints")
        if isinstance(explicit_hints, list):
            for existing in list(challenge.hints):
                self.db.delete(existing)
            valid_hints = [h for h in explicit_hints if isinstance(h, str) and h.strip()]
            for i, hint_text in enumerate(valid_hints):
                hint = Hint(
                    challenge_id=challenge.id,
                    order=i + 1,
                    text=hint_text.strip()[:2000],
                    cost_percent=10 * (i + 1)
                )
                self.db.add(hint)
                hints_created.append({
                    "order": i + 1,
                    "text": hint_text.strip(),
                    "cost_percent": 10 * (i + 1)
                })
            return hints_created

        # 3) If no hints provided anywhere, do not fabricate defaults
        return hints_created
