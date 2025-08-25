from sqlalchemy import Column, String, DateTime
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.sql import func

from ..database import Base

class ConfigKV(Base):
    __tablename__ = "config_kv"

    key = Column(String(100), primary_key=True)
    value_json = Column(JSON, nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
