from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.dialects.postgresql import UUID, ENUM
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from enum import Enum

from ..database import Base

class UserRole(str, Enum):
    ADMIN = 'ADMIN'
    AUTHOR = 'AUTHOR'
    REVIEWER = 'REVIEWER'
    PARTICIPANT = 'PARTICIPANT'
    OBSERVER = 'OBSERVER'

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    role = Column(ENUM(UserRole), default=UserRole.PARTICIPANT, nullable=False)
    password_hash = Column(String(255), nullable=False)
    totp_secret = Column(String(32), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_login = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    owned_teams = relationship("Team", back_populates="owner", cascade="all, delete-orphan")
    team_memberships = relationship("TeamMember", back_populates="user", cascade="all, delete-orphan")
    challenge_instances = relationship("ChallengeInstance", back_populates="user", cascade="all, delete-orphan")
    submissions = relationship("Submission", back_populates="user", cascade="all, delete-orphan")
    authored_challenges = relationship("Challenge", back_populates="author")
    awards = relationship("Award", back_populates="user", cascade="all, delete-orphan")
    writeups = relationship("WriteUp", back_populates="author", foreign_keys="WriteUp.author_user_id", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="actor")
    
    # 2FA Relationships
    two_factor_codes = relationship("TwoFactorCode", back_populates="user", cascade="all, delete-orphan")
    two_factor_settings = relationship("TwoFactorSettings", back_populates="user", uselist=False, cascade="all, delete-orphan")
    
    # Notifications
    notifications = relationship("Notification", back_populates="user", foreign_keys="Notification.user_id", cascade="all, delete-orphan")

class Team(Base):
    __tablename__ = "teams"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), unique=True, nullable=False)
    owner_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    owner = relationship("User", back_populates="owned_teams")
    members = relationship("TeamMember", back_populates="team", cascade="all, delete-orphan")
    challenge_instances = relationship("ChallengeInstance", back_populates="team")
    submissions = relationship("Submission", back_populates="team")
    awards = relationship("Award", back_populates="team")

class TeamMember(Base):
    __tablename__ = "team_members"

    team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id"), primary_key=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), primary_key=True)
    role = Column(String(50), default="member")
    joined_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    team = relationship("Team", back_populates="members")
    user = relationship("User", back_populates="team_memberships")
