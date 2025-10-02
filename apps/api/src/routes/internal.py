"""
Internal API routes for worker communication
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime
from typing import Optional
import os

from ..database import get_db
from ..models.lab import LabInstance, LabInstanceStatus

router = APIRouter(prefix="/internal", tags=["internal"])

# Internal API key for worker authentication
INTERNAL_API_KEY = os.getenv("INTERNAL_API_KEY", "change_me_in_production")

class UpdateLabStatusRequest(BaseModel):
    challenge_instance_id: str
    status: str
    container_id: Optional[str] = None
    container_name: Optional[str] = None
    ip_address: Optional[str] = None
    exposed_ports: Optional[str] = None  # JSON string
    started_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    error_message: Optional[str] = None

def verify_internal_key(api_key: str):
    """Verify internal API key"""
    if api_key != INTERNAL_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid internal API key"
        )
    return True

@router.post("/lab-instance/update-status")
async def update_lab_instance_status(
    request: UpdateLabStatusRequest,
    api_key: str,
    db: Session = Depends(get_db)
):
    """
    Internal endpoint for worker to update lab instance status.
    Requires internal API key authentication.
    """
    verify_internal_key(api_key)
    
    # Find the lab instance
    lab = db.query(LabInstance).filter(
        LabInstance.challenge_instance_id == request.challenge_instance_id
    ).order_by(LabInstance.created_at.desc()).first()
    
    if not lab:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lab instance not found"
        )
    
    # Update fields
    try:
        lab.status = LabInstanceStatus[request.status]
    except KeyError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status: {request.status}"
        )
    
    if request.container_id:
        lab.container_id = request.container_id
    if request.container_name:
        lab.container_name = request.container_name
    if request.ip_address:
        lab.ip_address = request.ip_address
    if request.exposed_ports:
        lab.exposed_ports = request.exposed_ports
    if request.started_at:
        lab.started_at = request.started_at
    if request.expires_at:
        lab.expires_at = request.expires_at
    if request.error_message:
        lab.error_message = request.error_message
    
    db.commit()
    
    return {
        "success": True,
        "lab_instance_id": str(lab.id),
        "status": lab.status.value
    }

