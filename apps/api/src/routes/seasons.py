from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timedelta
import uuid

from ..database import get_db
from ..models.user import User
from ..models.season import Season, Week
from ..models.challenge import Challenge
from ..utils.auth import get_current_user, require_admin
from ..utils.logging import get_logger

logger = get_logger(__name__)

router = APIRouter()

class SeasonResponse(BaseModel):
    id: str
    name: str
    start_at: datetime
    end_at: datetime
    total_weeks: int
    description: Optional[str]
    theme: Optional[str]
    is_active: bool
    current_week: Optional[int]

class WeekResponse(BaseModel):
    id: str
    season_id: str
    index: int
    opens_at: datetime
    closes_at: datetime
    is_mini_mission: bool
    is_open: bool
    challenges: List[dict]

class CreateSeasonRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    start_date: str = Field(..., description="Start date in YYYY-MM-DD format")
    total_weeks: int = Field(..., ge=1, le=52, description="Total number of weeks for the season")
    description: Optional[str] = Field(None, max_length=1000)
    theme: Optional[str] = Field(None, max_length=100)

class CreateWeekRequest(BaseModel):
    season_id: str
    index: int = Field(..., ge=1, le=52)
    opens_at: datetime
    closes_at: datetime
    is_mini_mission: bool = False

@router.get("/seasons", response_model=List[SeasonResponse])
async def get_seasons(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all seasons"""
    
    seasons = db.query(Season).order_by(Season.start_at.desc()).all()
    now = datetime.utcnow()
    
    season_responses = []
    for season in seasons:
        # Check if season is currently active
        is_active = season.start_at <= now <= season.end_at
        
        # Find current week if active
        current_week = None
        if is_active:
            week = db.query(Week).filter(
                Week.season_id == season.id,
                Week.opens_at <= now,
                Week.closes_at >= now
            ).first()
            if week:
                current_week = week.index
        
        season_responses.append(SeasonResponse(
            id=str(season.id),
            name=season.name,
            start_at=season.start_at,
            end_at=season.end_at,
            total_weeks=season.total_weeks,
            description=season.description,
            theme=season.theme,
            is_active=is_active,
            current_week=current_week
        ))
    
    return season_responses

@router.post("/seasons", status_code=status.HTTP_201_CREATED)
async def create_season(
    request: CreateSeasonRequest,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Create a new season (admin only)"""
    
    # Parse start date and calculate end date
    try:
        start_date = datetime.strptime(request.start_date, "%Y-%m-%d")
        # Calculate end date: start_date + (total_weeks * 7 days) - 1 day
        # This ensures the season ends on the last day of the final week
        end_date = start_date + timedelta(weeks=request.total_weeks) - timedelta(days=1)
        # Set time to end of day for end_date
        end_date = end_date.replace(hour=23, minute=59, second=59)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid start_date format. Use YYYY-MM-DD"
        )
    
    # Check for overlapping seasons
    existing_season = db.query(Season).filter(
        Season.start_at < end_date,
        Season.end_at > start_date
    ).first()
    
    if existing_season:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Season overlaps with existing season: {existing_season.name}"
        )
    
    # Create season
    season = Season(
        name=request.name,
        start_at=start_date,
        end_at=end_date,
        total_weeks=request.total_weeks,
        description=request.description,
        theme=request.theme
    )
    
    db.add(season)
    db.commit()
    db.refresh(season)
    
    logger.info("Season created",
               season_id=str(season.id),
               name=season.name,
               total_weeks=season.total_weeks,
               start_date=start_date.isoformat(),
               end_date=end_date.isoformat(),
               admin_id=str(current_user.id))
    
    return {
        "season_id": str(season.id),
        "name": season.name,
        "total_weeks": season.total_weeks,
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "status": "created"
    }

@router.get("/seasons/{season_id}/weeks", response_model=List[WeekResponse])
async def get_season_weeks(
    season_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get weeks for a season"""
    
    # Get season
    season = db.query(Season).filter(Season.id == season_id).first()
    if not season:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Season not found"
        )
    
    # Get weeks
    weeks = db.query(Week).filter(Week.season_id == season_id).order_by(Week.index).all()
    now = datetime.utcnow()
    
    week_responses = []
    for week in weeks:
        # Check if week is currently open
        is_open = week.opens_at <= now <= week.closes_at
        
        # Get challenges for this week (placeholder)
        challenges = []
        # TODO: Implement challenge-to-week mapping
        
        week_responses.append(WeekResponse(
            id=str(week.id),
            season_id=str(week.season_id),
            index=week.index,
            opens_at=week.opens_at,
            closes_at=week.closes_at,
            is_mini_mission=week.is_mini_mission,
            is_open=is_open,
            challenges=challenges
        ))
    
    return week_responses

@router.post("/seasons/{season_id}/weeks", status_code=status.HTTP_201_CREATED)
async def create_week(
    season_id: str,
    request: CreateWeekRequest,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Create a week in a season (admin only)"""
    
    # Get season
    season = db.query(Season).filter(Season.id == season_id).first()
    if not season:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Season not found"
        )
    
    # Validate dates within season bounds
    if request.opens_at < season.start_at or request.closes_at > season.end_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Week dates must be within season bounds"
        )
    
    if request.opens_at >= request.closes_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Week open date must be before close date"
        )
    
    # Check for duplicate week index
    existing_week = db.query(Week).filter(
        Week.season_id == season_id,
        Week.index == request.index
    ).first()
    
    if existing_week:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Week {request.index} already exists in this season"
        )
    
    # Create week
    week = Week(
        season_id=season_id,
        index=request.index,
        opens_at=request.opens_at,
        closes_at=request.closes_at,
        is_mini_mission=request.is_mini_mission
    )
    
    db.add(week)
    db.commit()
    db.refresh(week)
    
    logger.info("Week created",
               week_id=str(week.id),
               season_id=season_id,
               index=week.index,
               admin_id=str(current_user.id))
    
    return {
        "week_id": str(week.id),
        "season_id": season_id,
        "index": week.index,
        "status": "created"
    }
