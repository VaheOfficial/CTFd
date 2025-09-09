from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Integer, Boolean, JSON, Float, BigInteger
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

class LabInstanceStatus(str, Enum):
    NOT_STARTED = 'not_started'
    STARTING = 'starting'
    RUNNING = 'running'
    STOPPING = 'stopping'
    STOPPED = 'stopped'
    FAILED = 'failed'
    TERMINATED = 'terminated'
    EXPIRED = 'expired'

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
    docker_image = Column(String(255), nullable=True)  # Docker image name
    compose_yaml_s3_key = Column(String(255), nullable=True)  # S3 key for docker-compose.yml
    resource_limits = Column(JSON, nullable=False)  # CPU, memory, disk limits
    network_config = Column(JSON, nullable=False)  # Network configuration
    startup_script = Column(Text, nullable=True)  # Initialization script
    ports_json = Column(JSON, nullable=True)  # Port mappings configuration
    env_json = Column(JSON, nullable=True)  # Environment variables
    ttl_minutes = Column(Integer, nullable=False, default=60)  # Time-to-live in minutes
    max_retries = Column(Integer, nullable=False, default=3)  # Max retry attempts
    requires_gpu = Column(Boolean, nullable=False, default=False)  # GPU requirement
    requires_kasm = Column(Boolean, nullable=False, default=False)  # Kasm workspace requirement
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    challenge = relationship("Challenge", back_populates="lab_templates")
    instances = relationship("LabInstance", back_populates="template", cascade="all, delete-orphan")

class LabInstance(Base):
    __tablename__ = "lab_instances"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    lab_template_id = Column(UUID(as_uuid=True), ForeignKey("lab_templates.id"), nullable=False)
    challenge_instance_id = Column(UUID(as_uuid=True), ForeignKey("challenge_instances.id"), nullable=False)
    status = Column(ENUM(LabInstanceStatus), nullable=False, default=LabInstanceStatus.NOT_STARTED)
    
    # Container/VM details
    container_id = Column(String(255), nullable=True)  # Docker container ID or VM ID
    container_name = Column(String(255), nullable=True)  # Docker container name or VM name
    ip_address = Column(String(45), nullable=True)  # IPv4/IPv6 address
    network_type = Column(ENUM(NetworkType), nullable=False, default=NetworkType.ISOLATED)
    
    # Resource tracking
    resource_usage = Column(JSON, nullable=True)  # Current resource usage stats
    cpu_usage_percent = Column(Float, nullable=True)  # Current CPU usage
    memory_usage_bytes = Column(BigInteger, nullable=True)  # Current memory usage
    network_rx_bytes = Column(BigInteger, nullable=True)  # Network bytes received
    network_tx_bytes = Column(BigInteger, nullable=True)  # Network bytes transmitted
    
    # Access details
    kasm_workspace_id = Column(String(255), nullable=True)  # Kasm workspace ID if applicable
    kasm_url = Column(String(255), nullable=True)  # Kasm access URL
    vpn_config = Column(Text, nullable=True)  # WireGuard/OpenVPN config
    exposed_ports = Column(JSON, nullable=True)  # Map of exposed ports
    
    # Status tracking
    retry_count = Column(Integer, nullable=False, default=0)  # Number of retry attempts
    error_message = Column(Text, nullable=True)  # Last error message
    error_detail = Column(JSON, nullable=True)  # Detailed error information
    health_check_status = Column(String(50), nullable=True)  # Latest health check result
    
    # Timing
    started_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    last_health_check = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    terminated_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    template = relationship("LabTemplate", back_populates="instances", foreign_keys=[lab_template_id])
    challenge_instance = relationship("ChallengeInstance", back_populates="lab_instances")

# Add relationship to Challenge model
from .challenge import Challenge
Challenge.lab_templates = relationship("LabTemplate", back_populates="challenge", cascade="all, delete-orphan")

# Add relationship to ChallengeInstance model
from .challenge import ChallengeInstance
ChallengeInstance.lab_instances = relationship("LabInstance", back_populates="challenge_instance", cascade="all, delete-orphan")

