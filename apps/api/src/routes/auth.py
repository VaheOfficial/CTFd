from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import secrets

from ..database import get_db
from ..models.user import User, UserRole
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
            "role": user.role
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
    
    # Check TOTP if enabled
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
    from datetime import datetime
    user.last_login = datetime.utcnow()
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
            "role": user.role
        }
    )

@router.get("/me")
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return {
        "id": str(current_user.id),
        "username": current_user.username,
        "email": current_user.email,
        "role": current_user.role,
        "totp_enabled": bool(current_user.totp_secret),
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
