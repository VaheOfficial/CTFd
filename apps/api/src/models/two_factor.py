from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime, timedelta, timezone
import secrets
import string

from ..database import Base


class TwoFactorCode(Base):
    __tablename__ = "two_factor_codes"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    code = Column(String(6), nullable=False)  # 6-digit code
    purpose = Column(String(50), nullable=False)  # 'login', 'setup', 'reset'
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used_at = Column(DateTime(timezone=True), nullable=True)
    is_used = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="two_factor_codes")
    
    @classmethod
    def generate_code(cls, user_id: str, purpose: str = "login", expiry_minutes: int = 5) -> str:
        """Generate a new 6-digit 2FA code"""
        # Generate a 6-digit numeric code
        code = ''.join(secrets.choice(string.digits) for _ in range(6))
        
        # Calculate expiry time
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=expiry_minutes)
        
        return cls(
            user_id=user_id,
            code=code,
            purpose=purpose,
            expires_at=expires_at
        ), code
    
    def is_valid(self) -> bool:
        """Check if the code is still valid"""
        return (
            not self.is_used and 
            datetime.now(timezone.utc) < self.expires_at
        )
    
    def mark_used(self):
        """Mark the code as used"""
        self.is_used = True
        self.used_at = datetime.now(timezone.utc)


class TwoFactorSettings(Base):
    __tablename__ = "two_factor_settings"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, unique=True)
    email_2fa_enabled = Column(Boolean, default=False, nullable=False)
    backup_email = Column(String(255), nullable=True)  # Optional backup email
    last_code_sent_at = Column(DateTime(timezone=True), nullable=True)
    failed_attempts = Column(String, default=0, nullable=False)  # Track failed attempts
    locked_until = Column(DateTime(timezone=True), nullable=True)  # Rate limiting
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="two_factor_settings")
    
    def is_rate_limited(self) -> bool:
        """Check if user is rate limited"""
        if self.locked_until and datetime.now(timezone.utc) < self.locked_until:
            return True
        return False
    
    def can_send_code(self) -> bool:
        """Check if we can send a new code (rate limiting)"""
        if self.is_rate_limited():
            return False
        
        # Allow one code per minute
        if self.last_code_sent_at:
            time_since_last = datetime.now(timezone.utc) - self.last_code_sent_at
            return time_since_last.total_seconds() >= 60
        
        return True
    
    def increment_failed_attempts(self):
        """Increment failed attempts and apply rate limiting if needed"""
        self.failed_attempts = str(int(self.failed_attempts or 0) + 1)
        
        # Lock for 15 minutes after 5 failed attempts
        if int(self.failed_attempts) >= 5:
            self.locked_until = datetime.now(timezone.utc) + timedelta(minutes=15)
    
    def reset_failed_attempts(self):
        """Reset failed attempts after successful verification"""
        self.failed_attempts = "0"
        self.locked_until = None
