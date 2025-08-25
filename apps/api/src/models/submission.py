from sqlalchemy import Column, String, DateTime, ForeignKey, Integer, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from ..database import Base

class Submission(Base):
    __tablename__ = "submissions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    challenge_id = Column(UUID(as_uuid=True), ForeignKey("challenges.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id"), nullable=True)
    submitted_flag = Column(String(500), nullable=False)  # Store for audit purposes
    is_correct = Column(Boolean, nullable=False)
    points_awarded = Column(Integer, nullable=False, default=0)
    is_first_blood = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    challenge = relationship("Challenge", back_populates="submissions")
    user = relationship("User", back_populates="submissions")
    team = relationship("Team", back_populates="submissions")
