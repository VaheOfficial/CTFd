from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Integer, Boolean
from sqlalchemy.dialects.postgresql import UUID, ENUM, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from enum import Enum

from ..database import Base

class ChallengeTrack(str, Enum):
    INTEL_RECON = 'INTEL_RECON'
    ACCESS_EXPLOIT = 'ACCESS_EXPLOIT'
    IDENTITY_CLOUD = 'IDENTITY_CLOUD'
    C2_EGRESS = 'C2_EGRESS'
    DETECT_FORENSICS = 'DETECT_FORENSICS'

class ChallengeDifficulty(str, Enum):
    EASY = 'EASY'
    MEDIUM = 'MEDIUM'
    HARD = 'HARD'
    INSANE = 'INSANE'

class ChallengeMode(str, Enum):
    SOLO = 'solo'
    TEAM = 'team'

class ChallengeStatus(str, Enum):
    DRAFT = 'DRAFT'
    READY = 'READY'
    PUBLISHED = 'PUBLISHED'
    ARCHIVED = 'ARCHIVED'

class ArtifactKind(str, Enum):
    PCAP = 'pcap'
    CSV = 'csv'
    JSONL = 'jsonl'
    BIN = 'bin'
    ZIP = 'zip'
    EML = 'eml'
    LOG = 'log'
    IMAGE = 'image'
    OTHER = 'other'

class ValidatorType(str, Enum):
    BUILTIN = 'builtin'
    CONTAINER = 'container'

class NetworkPolicy(str, Enum):
    NONE = 'none'
    EGRESS_ONLY = 'egress_only'

class Challenge(Base):
    __tablename__ = "challenges"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    title = Column(String(200), nullable=False)
    track = Column(ENUM(ChallengeTrack), nullable=False)
    difficulty = Column(ENUM(ChallengeDifficulty), nullable=False)
    points_base = Column(Integer, nullable=False)
    time_cap_minutes = Column(Integer, nullable=False)
    mode = Column(ENUM(ChallengeMode), nullable=False)
    status = Column(ENUM(ChallengeStatus), default=ChallengeStatus.DRAFT)
    author_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    author = relationship("User", back_populates="authored_challenges")
    instances = relationship("ChallengeInstance", back_populates="challenge", cascade="all, delete-orphan")
    artifacts = relationship("Artifact", back_populates="challenge", cascade="all, delete-orphan")
    hints = relationship("Hint", back_populates="challenge", cascade="all, delete-orphan", order_by="Hint.order")
    validators = relationship("ValidatorConfig", back_populates="challenge", cascade="all, delete-orphan")
    submissions = relationship("Submission", back_populates="challenge")
    writeups = relationship("WriteUp", back_populates="challenge")
    lab_templates = relationship("LabTemplate", back_populates="challenge", cascade="all, delete-orphan")

class ChallengeInstance(Base):
    __tablename__ = "challenge_instances"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    challenge_id = Column(UUID(as_uuid=True), ForeignKey("challenges.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id"), nullable=True)
    dynamic_seed = Column(String(64), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    challenge = relationship("Challenge", back_populates="instances")
    user = relationship("User", back_populates="challenge_instances")
    team = relationship("Team", back_populates="challenge_instances")
    lab_instances = relationship("LabInstance", back_populates="challenge_instance", cascade="all, delete-orphan")

class Artifact(Base):
    __tablename__ = "artifacts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    challenge_id = Column(UUID(as_uuid=True), ForeignKey("challenges.id"), nullable=False)
    s3_key = Column(String(255), nullable=False)
    sha256 = Column(String(64), nullable=False)
    size_bytes = Column(Integer, nullable=False)
    kind = Column(ENUM(ArtifactKind), nullable=False)
    original_filename = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    challenge = relationship("Challenge", back_populates="artifacts")

class Hint(Base):
    __tablename__ = "hints"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    challenge_id = Column(UUID(as_uuid=True), ForeignKey("challenges.id"), nullable=False)
    order = Column(Integer, nullable=False)
    text = Column(Text, nullable=False)
    cost_percent = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    challenge = relationship("Challenge", back_populates="hints")

class ValidatorConfig(Base):
    __tablename__ = "validator_configs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    challenge_id = Column(UUID(as_uuid=True), ForeignKey("challenges.id"), nullable=False)
    type = Column(ENUM(ValidatorType), nullable=False)
    image = Column(String(255), nullable=True)
    command = Column(JSON, nullable=True)  # Array of strings
    timeout_sec = Column(Integer, nullable=False, default=30)
    network_policy = Column(ENUM(NetworkPolicy), default=NetworkPolicy.NONE)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    challenge = relationship("Challenge", back_populates="validators")


class HintConsumption(Base):
    __tablename__ = "hint_consumptions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    challenge_id = Column(UUID(as_uuid=True), ForeignKey("challenges.id"), nullable=False)
    hint_order = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    challenge = relationship("Challenge")