from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Integer, Boolean, JSON
from sqlalchemy.dialects.postgresql import UUID, ENUM
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from enum import Enum

from ..database import Base

class LabType(str, Enum):
    CONTAINER = 'container'
    VM = 'vm'
    NETWORK = 'network'

class LabStatus(str, Enum):
    PENDING = 'pending'
    RUNNING = 'running'
    STOPPED = 'stopped'
    FAILED = 'failed'
    TERMINATED = 'terminated'

class NetworkType(str, Enum):
    ISOLATED = 'isolated'
    INTERNET = 'internet'
    VPN = 'vpn'

class LabTemplate(Base):
    __tablename__ = "lab_templates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    challenge_id = Column(UUID(as_uuid=True), ForeignKey("challenges.id"), nullable=False)
    name = Column(String(100), nullable=False)
    type = Column(ENUM(LabType), nullable=False)
    image = Column(String(255), nullable=True)  # Docker image or VM template
    resource_limits = Column(JSON, nullable=False)  # CPU, memory, disk limits
    network_config = Column(JSON, nullable=False)  # Network configuration
    startup_script = Column(Text, nullable=True)  # Initialization script
    exposed_ports = Column(JSON, nullable=True)  # List of ports to expose
    environment = Column(JSON, nullable=True)  # Environment variables
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    challenge = relationship("Challenge", back_populates="lab_templates")
    instances = relationship("LabInstance", back_populates="template", cascade="all, delete-orphan")

class LabInstance(Base):
    __tablename__ = "lab_instances"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    template_id = Column(UUID(as_uuid=True), ForeignKey("lab_templates.id"), nullable=False)
    challenge_instance_id = Column(UUID(as_uuid=True), ForeignKey("challenge_instances.id"), nullable=False)
    status = Column(ENUM(LabStatus), nullable=False, default=LabStatus.PENDING)
    container_id = Column(String(255), nullable=True)  # Docker container ID or VM ID
    ip_address = Column(String(45), nullable=True)  # IPv4/IPv6 address
    network_type = Column(ENUM(NetworkType), nullable=False, default=NetworkType.ISOLATED)
    resource_usage = Column(JSON, nullable=True)  # Current resource usage
    error_message = Column(Text, nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    template = relationship("LabTemplate", back_populates="instances")
    challenge_instance = relationship("ChallengeInstance", back_populates="lab_instances")

# Add relationship to Challenge model
from .challenge import Challenge
Challenge.lab_templates = relationship("LabTemplate", back_populates="challenge", cascade="all, delete-orphan")

# Add relationship to ChallengeInstance model
from .challenge import ChallengeInstance
ChallengeInstance.lab_instances = relationship("LabInstance", back_populates="challenge_instance", cascade="all, delete-orphan")