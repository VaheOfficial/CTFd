from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field, validator
from typing import List, Optional
from datetime import datetime, timedelta
import uuid

from ..database import get_db
from ..models.user import User
from ..models.season import Season, Week, WeekChallenge
from ..models.challenge import Challenge
from ..utils.auth import get_current_user, require_admin
from ..utils.logging import get_logger
from ..utils.audit import create_audit_log

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
    total_weeks: int = Field(..., description="Total number of weeks for the season (must be 1, 2, 3, 4, 6, 8, 10, or 12)")
    description: Optional[str] = Field(None, max_length=1000)
    theme: Optional[str] = Field(None, max_length=100)
    
    @validator('total_weeks')
    def validate_total_weeks(cls, v):
        allowed_weeks = [1, 2, 3, 4, 6, 8, 10, 12]
        if v not in allowed_weeks:
            raise ValueError(f'total_weeks must be one of {allowed_weeks}')
        return v

class UpdateSeasonRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    start_date: Optional[str] = Field(None, description="Start date in YYYY-MM-DD format")
    total_weeks: Optional[int] = Field(None, description="Total number of weeks for the season (must be 1, 2, 3, 4, 6, 8, 10, or 12)")
    description: Optional[str] = None
    theme: Optional[str] = Field(None, max_length=100)
    
    @validator('total_weeks')
    def validate_total_weeks(cls, v):
        if v is not None:
            allowed_weeks = [1, 2, 3, 4, 6, 8, 10, 12]
            if v not in allowed_weeks:
                raise ValueError(f'total_weeks must be one of {allowed_weeks}')
        return v

class CreateWeekRequest(BaseModel):
    season_id: str
    index: int = Field(..., ge=1, le=52)
    opens_at: datetime
    closes_at: datetime
    is_mini_mission: bool = False

@router.get("/seasons/{season_id}", response_model=SeasonResponse)
async def get_season(
    season_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a season by ID"""
    
    season = db.query(Season).filter(Season.id == season_id).first()
    if not season:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Season not found")
    
    return SeasonResponse(
        id=str(season.id),
        name=season.name,
        start_at=season.start_at,
        end_at=season.end_at,
        total_weeks=season.total_weeks,
        description=season.description,
        theme=season.theme,
        is_active=season.start_at.replace(tzinfo=None) <= datetime.utcnow() <= season.end_at.replace(tzinfo=None),
        current_week=None
    )

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
        is_active = season.start_at.replace(tzinfo=None) <= now <= season.end_at.replace(tzinfo=None)
        
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

@router.patch("/seasons/{season_id}")
async def update_season(
    season_id: str,
    request: UpdateSeasonRequest,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Update a season (admin only)"""
    
    # Get season
    season = db.query(Season).filter(Season.id == season_id).first()
    if not season:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Season not found"
        )
    
    # Store original values for audit
    original_values = {
        "name": season.name,
        "start_at": season.start_at,
        "end_at": season.end_at,
        "total_weeks": season.total_weeks,
        "description": season.description,
        "theme": season.theme
    }
    
    # Update fields
    if request.name is not None:
        season.name = request.name
    
    if request.description is not None:
        season.description = request.description
        
    if request.theme is not None:
        season.theme = request.theme
    
    # Handle date/weeks updates
    if request.start_date is not None or request.total_weeks is not None:
        try:
            # Use existing values if not provided
            start_date_str = request.start_date if request.start_date else season.start_at.strftime("%Y-%m-%d")
            total_weeks = request.total_weeks if request.total_weeks is not None else season.total_weeks
            
            start_date = datetime.strptime(start_date_str, "%Y-%m-%d")
            end_date = start_date + timedelta(weeks=total_weeks) - timedelta(days=1)
            end_date = end_date.replace(hour=23, minute=59, second=59)
            
            season.start_at = start_date
            season.end_at = end_date
            season.total_weeks = total_weeks
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid start_date format. Use YYYY-MM-DD"
            )
    
    db.commit()
    db.refresh(season)
    
    # Create audit log
    changes = {}
    for field, original in original_values.items():
        current = getattr(season, field)
        if current != original:
            changes[field] = {"from": str(original), "to": str(current)}
    
    if changes:
        create_audit_log(
            db=db,
            action="season_updated",
            entity_type="season",
            entity_id=season_id,
            actor_user_id=str(current_user.id),
            details={"changes": changes}
        )
    
    logger.info("Season updated",
               season_id=str(season.id),
               admin_id=str(current_user.id),
               changes=list(changes.keys()))
    
    return {
        "season_id": str(season.id),
        "name": season.name,
        "total_weeks": season.total_weeks,
        "start_at": season.start_at.isoformat(),
        "end_at": season.end_at.isoformat(),
        "changes": changes,
        "status": "updated"
    }

@router.delete("/seasons/{season_id}")
async def delete_season(
    season_id: str,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Delete a season (admin only)"""
    
    season = db.query(Season).filter(Season.id == season_id).first()
    if not season:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Season not found"
        )
    
    season_name = season.name
    db.delete(season)
    db.commit()
    
    create_audit_log(
        db=db,
        action="season_deleted",
        entity_type="season",
        entity_id=season_id,
        actor_user_id=str(current_user.id),
        details={"name": season_name}
    )
    
    logger.info("Season deleted",
               season_id=season_id,
               name=season_name,
               admin_id=str(current_user.id))
    
    return {"status": "deleted", "season_id": season_id}

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
        
        # Get challenges for this week via WeekChallenge mapping
        mappings = db.query(WeekChallenge).filter(WeekChallenge.week_id == week.id).order_by(WeekChallenge.display_order).all()
        challenges = []
        for m in mappings:
            ch = db.query(Challenge).filter(Challenge.id == m.challenge_id).first()
            if not ch:
                continue
            challenges.append({
                "id": str(ch.id),
                "slug": ch.slug,
                "title": ch.title,
                "track": ch.track,
                "difficulty": ch.difficulty,
                "points_base": ch.points_base,
                "status": ch.status
            })
        
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

@router.patch("/weeks/{week_id}")
async def update_week(
    week_id: str,
    request: CreateWeekRequest,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Update a week (admin only)"""
    
    week = db.query(Week).filter(Week.id == week_id).first()
    if not week:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Week not found"
        )
    
    # Get season for validation
    season = db.query(Season).filter(Season.id == week.season_id).first()
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
    
    # Update week
    week.index = request.index
    week.opens_at = request.opens_at
    week.closes_at = request.closes_at
    week.is_mini_mission = request.is_mini_mission
    
    db.commit()
    db.refresh(week)
    
    create_audit_log(
        db=db,
        action="week_updated",
        entity_type="week",
        entity_id=week_id,
        actor_user_id=str(current_user.id),
        details={"season_id": str(week.season_id), "index": week.index}
    )
    
    logger.info("Week updated",
               week_id=str(week.id),
               season_id=str(week.season_id),
               index=week.index,
               admin_id=str(current_user.id))
    
    return {
        "week_id": str(week.id),
        "season_id": str(week.season_id),
        "index": week.index,
        "status": "updated"
    }

@router.delete("/weeks/{week_id}")
async def delete_week(
    week_id: str,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Delete a week (admin only)"""
    
    week = db.query(Week).filter(Week.id == week_id).first()
    if not week:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Week not found"
        )
    
    season_id = str(week.season_id)
    week_index = week.index
    
    db.delete(week)
    db.commit()
    
    create_audit_log(
        db=db,
        action="week_deleted",
        entity_type="week",
        entity_id=week_id,
        actor_user_id=str(current_user.id),
        details={"season_id": season_id, "index": week_index}
    )
    
    logger.info("Week deleted",
               week_id=week_id,
               season_id=season_id,
               index=week_index,
               admin_id=str(current_user.id))
    
    return {"status": "deleted", "week_id": week_id}

@router.post("/weeks/{week_id}/challenges")
async def assign_challenge_to_week(
    week_id: str,
    challenge_id: str,
    display_order: int = 0,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Assign a challenge to a week (admin only)"""
    
    # Validate week exists
    week = db.query(Week).filter(Week.id == week_id).first()
    if not week:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Week not found"
        )
    
    # Validate challenge exists
    challenge = db.query(Challenge).filter(Challenge.id == challenge_id).first()
    if not challenge:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Challenge not found"
        )
    
    # Check if already assigned
    existing = db.query(WeekChallenge).filter(
        WeekChallenge.week_id == week_id,
        WeekChallenge.challenge_id == challenge_id
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Challenge already assigned to this week"
        )
    
    # Create assignment
    week_challenge = WeekChallenge(
        week_id=week_id,
        challenge_id=challenge_id,
        display_order=display_order
    )
    
    db.add(week_challenge)
    db.commit()
    
    create_audit_log(
        db=db,
        action="challenge_assigned_to_week",
        entity_type="week_challenge",
        entity_id=str(week_challenge.id),
        actor_user_id=str(current_user.id),
        details={
            "week_id": week_id,
            "challenge_id": challenge_id,
            "season_id": str(week.season_id)
        }
    )
    
    logger.info("Challenge assigned to week",
               week_id=week_id,
               challenge_id=challenge_id,
               admin_id=str(current_user.id))
    
    return {
        "status": "assigned",
        "week_id": week_id,
        "challenge_id": challenge_id
    }

@router.delete("/weeks/{week_id}/challenges/{challenge_id}")
async def unassign_challenge_from_week(
    week_id: str,
    challenge_id: str,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Remove a challenge from a week (admin only)"""
    
    week_challenge = db.query(WeekChallenge).filter(
        WeekChallenge.week_id == week_id,
        WeekChallenge.challenge_id == challenge_id
    ).first()
    
    if not week_challenge:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Challenge not assigned to this week"
        )
    
    db.delete(week_challenge)
    db.commit()
    
    create_audit_log(
        db=db,
        action="challenge_unassigned_from_week",
        entity_type="week_challenge",
        entity_id=str(week_challenge.id),
        actor_user_id=str(current_user.id),
        details={
            "week_id": week_id,
            "challenge_id": challenge_id
        }
    )
    
    logger.info("Challenge unassigned from week",
               week_id=week_id,
               challenge_id=challenge_id,
               admin_id=str(current_user.id))
    
    return {
        "status": "unassigned",
        "week_id": week_id,
        "challenge_id": challenge_id
    }
