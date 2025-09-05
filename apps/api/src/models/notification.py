from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from ..database import Base

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    read = Column(Boolean, default=False)
    
    # Optional: If you want to target specific users
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    user = relationship("User", foreign_keys=[user_id], back_populates="notifications")
    
    # For global notifications (sent to all users)
    is_global = Column(Boolean, default=False)
    
    # For admin tracking
    created_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_by = relationship("User", foreign_keys=[created_by_id])