from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from ..database import get_db
from ..models.user import User
from ..models.notification import Notification
from ..utils.auth import require_admin, get_current_user
from ..utils.logging import get_logger

router = APIRouter()
logger = get_logger(__name__)

class NotificationCreate(BaseModel):
    title: str
    message: str
    user_id: Optional[int] = None  # If None, notification is global
    is_global: bool = False

class NotificationResponse(BaseModel):
    id: int
    title: str
    message: str
    created_at: datetime
    read: bool
    is_global: bool

    class Config:
        from_attributes = True

@router.get("/notifications", response_model=List[NotificationResponse])
async def get_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get notifications for the current user"""
    notifications = db.query(Notification).filter(
        or_(
            Notification.user_id == current_user.id,
            Notification.is_global == True
        )
    ).order_by(Notification.created_at.desc()).all()
    
    return notifications

@router.post("/notifications", response_model=NotificationResponse, status_code=status.HTTP_201_CREATED)
async def create_notification(
    notification: NotificationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)  # Only admins can create notifications
):
    """Create a new notification"""
    db_notification = Notification(
        title=notification.title,
        message=notification.message,
        user_id=notification.user_id,
        is_global=notification.is_global,
        created_by_id=current_user.id
    )
    
    db.add(db_notification)
    db.commit()
    db.refresh(db_notification)
    
    return db_notification

@router.put("/notifications/{notification_id}/read")
async def mark_notification_as_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark a notification as read"""
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        or_(
            Notification.user_id == current_user.id,
            Notification.is_global == True
        )
    ).first()
    
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    
    notification.read = True
    db.commit()
    
    return {"status": "success"}

@router.put("/notifications/read-all")
async def mark_all_notifications_as_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark all notifications as read for the current user"""
    db.query(Notification).filter(
        or_(
            Notification.user_id == current_user.id,
            Notification.is_global == True
        ),
        Notification.read == False
    ).update({"read": True})
    
    db.commit()
    
    return {"status": "success"}