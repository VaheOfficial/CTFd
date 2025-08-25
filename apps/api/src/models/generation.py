from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Integer, Boolean, Float
from sqlalchemy.dialects.postgresql import UUID, JSON, ENUM
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from enum import Enum

from ..database import Base

class GenerationStatus(str, Enum):
    DRAFT = 'DRAFT'
    MATERIALIZED = 'MATERIALIZED'
    PUBLISHED = 'PUBLISHED'
    FAILED = 'FAILED'

class GenerationPlan(Base):
    __tablename__ = "generation_plans"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    challenge_id = Column(UUID(as_uuid=True), ForeignKey("challenges.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # Generation metadata
    prompt = Column(Text, nullable=False)
    provider = Column(String(50), nullable=False)
    model = Column(String(100), nullable=False)
    seed = Column(Integer, nullable=True)
    
    # LLM response
    generated_json = Column(JSON, nullable=False)
    artifacts_plan = Column(JSON, nullable=False)
    
    # Usage tracking
    prompt_tokens = Column(Integer, nullable=True)
    completion_tokens = Column(Integer, nullable=True)
    total_tokens = Column(Integer, nullable=True)
    cost_usd = Column(Float, nullable=True)
    
    # Status tracking
    status = Column(ENUM(GenerationStatus), default=GenerationStatus.DRAFT)
    materialization_trace = Column(JSON, nullable=True)  # Track artifact generation
    error_message = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    materialized_at = Column(DateTime(timezone=True), nullable=True)
    published_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    challenge = relationship("Challenge")
    user = relationship("User")
