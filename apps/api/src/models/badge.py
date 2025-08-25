from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from ..database import Base

class Badge(Base):
    __tablename__ = "badges"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String(50), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=False)
    icon_key = Column(String(100), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    awards = relationship("Award", back_populates="badge", cascade="all, delete-orphan")

class Award(Base):
    __tablename__ = "awards"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    badge_id = Column(UUID(as_uuid=True), ForeignKey("badges.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id"), nullable=True)
    awarded_at = Column(DateTime(timezone=True), server_default=func.now())
    reason = Column(String(255), nullable=False)

    # Relationships
    badge = relationship("Badge", back_populates="awards")
    user = relationship("User", back_populates="awards")
    team = relationship("Team", back_populates="awards")
