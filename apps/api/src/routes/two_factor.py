from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta, timezone
import logging

from ..database import get_db
from ..models.user import User
from ..models.two_factor import TwoFactorCode, TwoFactorSettings
from ..services.email_service import email_service
from ..utils.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()


# Pydantic models
class Send2FACodeRequest(BaseModel):
    email: EmailStr
    purpose: str = "login"  # "login", "setup", "reset"


class Verify2FACodeRequest(BaseModel):
    email: EmailStr
    code: str
    purpose: str = "login"


class Enable2FARequest(BaseModel):
    enable: bool


class TwoFactorStatusResponse(BaseModel):
    email_2fa_enabled: bool
    backup_email: str | None = None
    rate_limited: bool = False
    rate_limit_expires: datetime | None = None


class LoginWith2FARequest(BaseModel):
    email: EmailStr
    password: str
    two_factor_code: str | None = None


# Routes
@router.post("/auth/2fa/send-code")
async def send_2fa_code(
    request: Send2FACodeRequest,
    db: Session = Depends(get_db)
):
    """Send 2FA code to user's email"""
    
    # Find user by email
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        # Don't reveal if email exists or not for security
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Please wait before requesting another code"
        )
    
    # Get or create 2FA settings
    settings = db.query(TwoFactorSettings).filter(
        TwoFactorSettings.user_id == user.id
    ).first()
    
    if not settings:
        settings = TwoFactorSettings(user_id=user.id)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    
    # Check rate limiting
    if not settings.can_send_code():
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Please wait before requesting another code"
        )
    
    # Invalidate any existing codes for this user and purpose
    existing_codes = db.query(TwoFactorCode).filter(
        TwoFactorCode.user_id == user.id,
        TwoFactorCode.purpose == request.purpose,
        TwoFactorCode.is_used == False
    ).all()
    
    for code in existing_codes:
        code.is_used = True
    
    # Generate new code
    code_record, code = TwoFactorCode.generate_code(
        user_id=str(user.id),
        purpose=request.purpose,
        expiry_minutes=5
    )
    
    db.add(code_record)
    
    # Update settings
    settings.last_code_sent_at = datetime.now(timezone.utc)
    
    db.commit()
    
    # Send email
    if not email_service.send_2fa_code(
        to_email=user.email,
        code=code,
        username=user.username,
        purpose=request.purpose
    ):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send verification code"
        )
    
    return {
        "message": "Verification code sent to your email",
        "expires_in_minutes": 5
    }


@router.post("/auth/2fa/verify-code")
async def verify_2fa_code(
    request: Verify2FACodeRequest,
    db: Session = Depends(get_db)
):
    """Verify 2FA code"""
    
    # Find user by email
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid code"
        )
    
    # Get 2FA settings
    settings = db.query(TwoFactorSettings).filter(
        TwoFactorSettings.user_id == user.id
    ).first()
    
    if not settings:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid code"
        )
    
    # Check if rate limited
    if settings.is_rate_limited():
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed attempts. Please try again later."
        )
    
    # Find valid code
    code_record = db.query(TwoFactorCode).filter(
        TwoFactorCode.user_id == user.id,
        TwoFactorCode.code == request.code,
        TwoFactorCode.purpose == request.purpose,
        TwoFactorCode.is_used == False
    ).first()
    
    if not code_record or not code_record.is_valid():
        # Increment failed attempts
        settings.increment_failed_attempts()
        db.commit()
        
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired code"
        )
    
    # Mark code as used
    code_record.mark_used()
    
    # Reset failed attempts on success
    settings.reset_failed_attempts()
    
    db.commit()
    
    return {
        "message": "Code verified successfully",
        "user_id": str(user.id),
        "valid": True
    }


@router.get("/auth/2fa/status")
async def get_2fa_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> TwoFactorStatusResponse:
    """Get current user's 2FA status"""
    
    settings = db.query(TwoFactorSettings).filter(
        TwoFactorSettings.user_id == current_user.id
    ).first()
    
    if not settings:
        return TwoFactorStatusResponse(
            email_2fa_enabled=False,
            backup_email=None,
            rate_limited=False
        )
    
    return TwoFactorStatusResponse(
        email_2fa_enabled=settings.email_2fa_enabled,
        backup_email=settings.backup_email,
        rate_limited=settings.is_rate_limited(),
        rate_limit_expires=settings.locked_until
    )


@router.post("/auth/2fa/enable")
async def toggle_2fa(
    request: Enable2FARequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Enable or disable 2FA for current user"""
    
    # Get or create 2FA settings
    settings = db.query(TwoFactorSettings).filter(
        TwoFactorSettings.user_id == current_user.id
    ).first()
    
    if not settings:
        settings = TwoFactorSettings(user_id=current_user.id)
        db.add(settings)
    
    settings.email_2fa_enabled = request.enable
    db.commit()
    
    action = "enabled" if request.enable else "disabled"
    return {
        "message": f"Two-factor authentication has been {action}",
        "email_2fa_enabled": settings.email_2fa_enabled
    }
