from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import secrets

from ..database import get_db
from ..models.user import User, UserRole
from ..models.two_factor import TwoFactorSettings, TwoFactorCode
from ..services.email_service import email_service
from ..utils.auth import (
    verify_password, 
    get_password_hash, 
    create_access_token, 
    create_refresh_token,
    get_current_user,
    generate_totp_secret,
    verify_totp,
    generate_qr_code_url
)

router = APIRouter()

class SignupRequest(BaseModel):
    username: str
    email: str
    password: str

class LoginRequest(BaseModel):
    username: str
    password: str
    totp_code: Optional[str] = None
    two_factor_code: Optional[str] = None

class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    user: dict

class TOTPSetupResponse(BaseModel):
    secret: str
    qr_code_url: str

@router.post("/signup", response_model=LoginResponse)
async def signup(request: SignupRequest, db: Session = Depends(get_db)):
    """Register a new user"""
    
    # Check if username exists
    if db.query(User).filter(User.username == request.username).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already exists"
        )
    
    # Check if email exists
    if db.query(User).filter(User.email == request.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already exists"
        )
    
    # Create new user
    user = User(
        username=request.username,
        email=request.email,
        password_hash=get_password_hash(request.password),
        role=UserRole.PARTICIPANT
    )
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Create tokens
    access_token = create_access_token(data={"sub": str(user.id)})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})
    
    return LoginResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user={
            "id": str(user.id),
            "username": user.username,
            "email": user.email,
            "role": user.role.value  # Convert enum to string value
        }
    )

@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate a user"""
    
    # Find user
    user = db.query(User).filter(User.username == request.username).first()
    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    # Check if 2FA is enabled
    two_factor_settings = db.query(TwoFactorSettings).filter(
        TwoFactorSettings.user_id == user.id
    ).first()
    
    # Check email-based 2FA
    if two_factor_settings and two_factor_settings.email_2fa_enabled:
        if not request.two_factor_code:
            # Check rate limiting
            if not two_factor_settings.can_send_code():
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Please wait before requesting another code"
                )
            
            # Clean up expired codes first
            from datetime import datetime, timezone
            expired_codes = db.query(TwoFactorCode).filter(
                TwoFactorCode.user_id == user.id,
                TwoFactorCode.purpose == "login",
                TwoFactorCode.expires_at < datetime.now(timezone.utc)
            ).all()
            
            for code in expired_codes:
                db.delete(code)
            
            # Invalidate any remaining unused codes for this user
            existing_codes = db.query(TwoFactorCode).filter(
                TwoFactorCode.user_id == user.id,
                TwoFactorCode.purpose == "login",
                TwoFactorCode.is_used == False
            ).all()
            
            for code in existing_codes:
                code.is_used = True
            
            # Generate and send new 2FA code
            from datetime import datetime, timezone
            code_record, code = TwoFactorCode.generate_code(
                user_id=str(user.id),
                purpose="login",
                expiry_minutes=5
            )
            
            db.add(code_record)
            two_factor_settings.last_code_sent_at = datetime.now(timezone.utc)
            db.commit()
            
            # Send email
            if not email_service.send_2fa_code(
                to_email=user.email,
                code=code,
                username=user.username,
                purpose="login"
            ):
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to send verification code"
                )
            
            # User needs to provide 2FA code
            raise HTTPException(
                status_code=status.HTTP_202_ACCEPTED,
                detail="Two-factor authentication required. Check your email for a verification code."
            )
        
        # Verify 2FA code
        code_record = db.query(TwoFactorCode).filter(
            TwoFactorCode.user_id == user.id,
            TwoFactorCode.code == request.two_factor_code,
            TwoFactorCode.purpose == "login",
            TwoFactorCode.is_used == False
        ).first()
        
        if not code_record or not code_record.is_valid():
            two_factor_settings.increment_failed_attempts()
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired two-factor code"
            )
        
        # Mark code as used and reset failed attempts
        code_record.mark_used()
        two_factor_settings.reset_failed_attempts()
    
    # Check TOTP if enabled (legacy support)
    if user.totp_secret:
        if not request.totp_code:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="TOTP code required"
            )
        
        if not verify_totp(user.totp_secret, request.totp_code):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid TOTP code"
            )
    
    # Update last login
    from datetime import datetime, timezone
    user.last_login = datetime.now(timezone.utc)
    db.commit()
    
    # Create tokens
    access_token = create_access_token(data={"sub": str(user.id)})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})
    
    return LoginResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user={
            "id": str(user.id),
            "username": user.username,
            "email": user.email,
            "role": user.role.value  # Convert enum to string value
        }
    )

@router.get("/me")
async def get_current_user_info(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user information"""
    
    # Get 2FA settings
    two_factor_settings = db.query(TwoFactorSettings).filter(
        TwoFactorSettings.user_id == current_user.id
    ).first()
    
    return {
        "id": str(current_user.id),
        "username": current_user.username,
        "email": current_user.email,
        "role": current_user.role.value,  # Convert enum to string value
        "totp_enabled": bool(current_user.totp_secret),
        "email_2fa_enabled": two_factor_settings.email_2fa_enabled if two_factor_settings else False,
        "created_at": current_user.created_at,
        "last_login": current_user.last_login
    }

@router.post("/totp/setup", response_model=TOTPSetupResponse)
async def setup_totp(current_user: User = Depends(get_current_user)):
    """Setup TOTP for current user"""
    
    if current_user.totp_secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="TOTP already enabled"
        )
    
    # Generate secret
    secret = generate_totp_secret()
    qr_code_url = generate_qr_code_url(secret, current_user.username)
    
    return TOTPSetupResponse(
        secret=secret,
        qr_code_url=qr_code_url
    )

@router.post("/totp/enable")
async def enable_totp(
    totp_code: str,
    secret: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Enable TOTP with verification"""
    
    if current_user.totp_secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="TOTP already enabled"
        )
    
    # Verify the code
    if not verify_totp(secret, totp_code):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid TOTP code"
        )
    
    # Save the secret
    current_user.totp_secret = secret
    db.commit()
    
    return {"message": "TOTP enabled successfully"}

@router.post("/totp/disable")
async def disable_totp(
    totp_code: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Disable TOTP"""
    
    if not current_user.totp_secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="TOTP not enabled"
        )
    
    # Verify the code
    if not verify_totp(current_user.totp_secret, totp_code):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid TOTP code"
        )
    
    # Remove the secret
    current_user.totp_secret = None
    db.commit()
    
    return {"message": "TOTP disabled successfully"}

@router.post("/logout")
async def logout():
    """Logout (client should discard tokens)"""
    return {"message": "Logout successful"}
