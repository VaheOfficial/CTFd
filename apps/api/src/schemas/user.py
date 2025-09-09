from pydantic import BaseModel, UUID4
from typing import Optional
from datetime import datetime
from ..models.user import UserRole

class UserBase(BaseModel):
    id: UUID4
    username: str
    email: str
    role: UserRole
    created_at: datetime
    last_login: Optional[datetime] = None

    class Config:
        from_attributes = True  # This enables ORM mode
