from sqlalchemy import Column, String, DateTime, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID, JSON, ENUM
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from enum import Enum

from ..database import Base

class LabInstanceStatus(str, Enum):
    STARTING = 'STARTING'
    RUNNING = 'RUNNING'
    STOPPING = 'STOPPING'
    STOPPED = 'STOPPED'
    ERROR = 'ERROR'

class LabTemplate(Base):
    __tablename__ = "lab_templates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    challenge_id = Column(UUID(as_uuid=True), ForeignKey("challenges.id"), nullable=False)
    compose_yaml_s3_key = Column(String(255), nullable=True)
    docker_image = Column(String(255), nullable=True)
    ports_json = Column(JSON, nullable=False)
    env_json = Column(JSON, nullable=False)
    ttl_minutes = Column(Integer, nullable=False, default=60)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    challenge = relationship("Challenge", back_populates="lab_templates")
    instances = relationship("LabInstance", back_populates="lab_template", cascade="all, delete-orphan")

class LabInstance(Base):
    __tablename__ = "lab_instances"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    lab_template_id = Column(UUID(as_uuid=True), ForeignKey("lab_templates.id"), nullable=False)
    challenge_instance_id = Column(UUID(as_uuid=True), ForeignKey("challenge_instances.id"), nullable=False)
    container_id = Column(String(255), nullable=True)
    status = Column(ENUM(LabInstanceStatus), default=LabInstanceStatus.STARTING)
    started_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    torn_down_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    lab_template = relationship("LabTemplate", back_populates="instances")
    challenge_instance = relationship("ChallengeInstance", back_populates="lab_instances")
