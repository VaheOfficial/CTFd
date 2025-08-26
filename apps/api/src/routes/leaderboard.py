from fastapi import APIRouter, HTTPException, Depends, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

from ..database import get_db
from ..models.user import User
from ..models.season import Season
from ..models.submission import Submission
from ..models.challenge import Challenge
from ..models.badge import Badge, Award
from ..models.leaderboard import LeaderboardSnapshot
from ..utils.auth import get_current_user
from ..utils.logging import get_logger

logger = get_logger(__name__)

router = APIRouter()

class LeaderboardEntry(BaseModel):
    rank: int
    user_id: str
    username: str
    total_points: int
    challenges_solved: int
    last_submission: Optional[datetime]
    is_current_user: bool = False

class LeaderboardResponse(BaseModel):
    season_id: str
    season_name: str
    total_participants: int
    entries: List[LeaderboardEntry]
    current_user_rank: Optional[int]
    last_updated: datetime

class BadgeResponse(BaseModel):
    id: str
    code: str
    name: str
    description: str
    icon_key: str
    awarded_at: datetime
    reason: str

@router.get("/leaderboard/season/{season_id}", response_model=LeaderboardResponse)
async def get_season_leaderboard(
    season_id: str,
    limit: int = Query(25, le=100, description="Number of entries to return"),
    snapshot: bool = Query(False, description="Use cached snapshot if available"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get leaderboard for a season"""
    
    # Get season
    season = db.query(Season).filter(Season.id == season_id).first()
    if not season:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Season not found"
        )
    
    # Check for cached snapshot if requested
    if snapshot:
        latest_snapshot = db.query(LeaderboardSnapshot).filter(
            LeaderboardSnapshot.season_id == season_id
        ).order_by(desc(LeaderboardSnapshot.generated_at)).first()
        
        if latest_snapshot:
            # Return cached data
            snapshot_data = latest_snapshot.json_blob
            entries = []
            
            for i, entry in enumerate(snapshot_data.get("participants", [])[:limit]):
                entries.append(LeaderboardEntry(
                    rank=i + 1,
                    user_id=entry["user_id"],
                    username=entry["username"],
                    total_points=entry["total_points"],
                    challenges_solved=entry["challenges_solved"],
                    last_submission=datetime.fromisoformat(entry["last_submission"]) if entry.get("last_submission") else None,
                    is_current_user=entry["user_id"] == str(current_user.id)
                ))
            
            # Find current user rank
            current_user_rank = None
            for i, entry in enumerate(snapshot_data.get("participants", [])):
                if entry["user_id"] == str(current_user.id):
                    current_user_rank = i + 1
                    break
            
            return LeaderboardResponse(
                season_id=season_id,
                season_name=season.name,
                total_participants=snapshot_data.get("total_participants", 0),
                entries=entries,
                current_user_rank=current_user_rank,
                last_updated=latest_snapshot.generated_at
            )
    
    # Generate live leaderboard
    try:
        # Get user scores for the season
        # This is a simplified version - in production, you'd want more sophisticated scoring
        user_scores = db.query(
            Submission.user_id,
            func.sum(Submission.points_awarded).label('total_points'),
            func.count(Submission.id).filter(Submission.is_correct == True).label('challenges_solved'),
            func.max(Submission.created_at).label('last_submission')
        ).filter(
            Submission.is_correct == True,
            Submission.created_at >= season.start_at,
            Submission.created_at <= season.end_at
        ).group_by(Submission.user_id).subquery()
        
        # Join with user info and order by points, then by earliest submission for tie-breaking
        leaderboard_query = db.query(
            User.id,
            User.username,
            user_scores.c.total_points,
            user_scores.c.challenges_solved,
            user_scores.c.last_submission
        ).join(
            user_scores, User.id == user_scores.c.user_id
        ).order_by(
            desc(user_scores.c.total_points),
            user_scores.c.last_submission  # Earlier submissions win ties
        )
        
        # Get limited results
        leaderboard_data = leaderboard_query.limit(limit).all()
        
        # Build response
        entries = []
        current_user_rank = None
        
        for i, (user_id, username, total_points, challenges_solved, last_submission) in enumerate(leaderboard_data):
            is_current_user = str(user_id) == str(current_user.id)
            if is_current_user:
                current_user_rank = i + 1
            
            entries.append(LeaderboardEntry(
                rank=i + 1,
                user_id=str(user_id),
                username=username,
                total_points=total_points or 0,
                challenges_solved=challenges_solved or 0,
                last_submission=last_submission,
                is_current_user=is_current_user
            ))
        
        # If current user not in top results, find their rank
        if current_user_rank is None:
            # Compute rank considering season bounds
            current_user_points = db.query(func.sum(Submission.points_awarded)).filter(
                Submission.user_id == current_user.id,
                Submission.is_correct == True,
                Submission.created_at >= season.start_at,
                Submission.created_at <= season.end_at
            ).scalar() or 0
            user_rank_query = db.query(func.count().label('rank')).select_from(
                db.query(
                    User.id,
                    func.sum(Submission.points_awarded).label('total_points')
                ).join(
                    Submission, User.id == Submission.user_id
                ).filter(
                    Submission.is_correct == True,
                    Submission.created_at >= season.start_at,
                    Submission.created_at <= season.end_at
                ).group_by(User.id).having(
                    func.sum(Submission.points_awarded) > current_user_points
                ).subquery()
            )
            
            rank_result = user_rank_query.scalar()
            if rank_result is not None:
                current_user_rank = rank_result + 1
        
        # Get total participants
        total_participants = db.query(func.count(func.distinct(Submission.user_id))).filter(
            Submission.is_correct == True,
            Submission.created_at >= season.start_at,
            Submission.created_at <= season.end_at
        ).scalar() or 0
        
        return LeaderboardResponse(
            season_id=season_id,
            season_name=season.name,
            total_participants=total_participants,
            entries=entries,
            current_user_rank=current_user_rank,
            last_updated=datetime.utcnow()
        )
        
    except Exception as e:
        logger.error("Leaderboard generation failed",
                    season_id=season_id,
                    error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate leaderboard"
        )

@router.get("/badges/me", response_model=List[BadgeResponse])
async def get_my_badges(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's badges"""
    
    # Get user's awards with badge details
    awards = db.query(Award, Badge).join(
        Badge, Award.badge_id == Badge.id
    ).filter(
        Award.user_id == current_user.id
    ).order_by(desc(Award.awarded_at)).all()
    
    badge_responses = []
    for award, badge in awards:
        badge_responses.append(BadgeResponse(
            id=str(badge.id),
            code=badge.code,
            name=badge.name,
            description=badge.description,
            icon_key=badge.icon_key,
            awarded_at=award.awarded_at,
            reason=award.reason
        ))
    
    return badge_responses
