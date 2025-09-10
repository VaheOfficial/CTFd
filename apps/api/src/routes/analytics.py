from datetime import datetime, timedelta
from typing import Dict, Any

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.user import User
from ..models.challenge import Challenge, ChallengeInstance
from ..models.submission import Submission
from ..models.lab import LabInstance, LabInstanceStatus
from ..models.audit import AuditLog
from ..utils.auth import require_admin

router = APIRouter()


@router.get("/overview")
async def analytics_overview(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    now = datetime.utcnow()
    day_ago = now - timedelta(days=1)
    week_ago = now - timedelta(days=7)

    total_users = db.query(func.count(User.id)).scalar() or 0
    total_challenges = db.query(func.count(Challenge.id)).scalar() or 0
    submissions_last_24h = db.query(Submission).filter(Submission.created_at >= day_ago).count()
    active_labs = db.query(LabInstance).filter(LabInstance.status == LabInstanceStatus.RUNNING).count()
    ai_generations_last_24h = db.query(AuditLog).filter(
        AuditLog.action == "ai_challenge_generated",
        AuditLog.created_at >= day_ago,
    ).count()

    daily_active_users = db.query(func.count(func.distinct(Submission.user_id))).filter(
        Submission.created_at >= day_ago
    ).scalar() or 0

    weekly_active_users = db.query(func.count(func.distinct(Submission.user_id))).filter(
        Submission.created_at >= week_ago
    ).scalar() or 0

    return {
        "totals": {
            "users": int(total_users),
            "challenges": int(total_challenges),
            "active_labs": int(active_labs),
        },
        "engagement": {
            "submissions_last_24h": int(submissions_last_24h),
            "daily_active_users": int(daily_active_users),
            "weekly_active_users": int(weekly_active_users),
            "ai_generations_last_24h": int(ai_generations_last_24h),
        },
    }


@router.get("/usage")
async def analytics_usage(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    now = datetime.utcnow()
    day_ago = now - timedelta(days=1)

    # Submissions by challenge (top 10)
    top_challenges = db.query(
        Submission.challenge_id,
        func.count(Submission.id).label("count"),
    ).filter(
        Submission.created_at >= day_ago
    ).group_by(
        Submission.challenge_id
    ).order_by(
        func.count(Submission.id).desc()
    ).limit(10).all()

    top = []
    for challenge_id, count in top_challenges:
        challenge = db.query(Challenge).filter(Challenge.id == challenge_id).first()
        top.append({
            "challenge_id": str(challenge_id),
            "title": challenge.title if challenge else "unknown",
            "submissions": int(count),
        })

    # Instances created last 24h
    instances_last_24h = db.query(ChallengeInstance).filter(ChallengeInstance.created_at >= day_ago).count()

    return {
        "top_challenges_last_24h": top,
        "instances_last_24h": int(instances_last_24h),
    }


@router.get("/health")
async def analytics_health(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    now = datetime.utcnow()
    day_ago = now - timedelta(days=1)

    # Error-like audit events (heuristic)
    error_events = db.query(AuditLog).filter(
        AuditLog.created_at >= day_ago,
        AuditLog.action.ilike("%failed%") | AuditLog.action.ilike("%error%")
    ).count()

    # Lab health summary
    lab_counts = {
        status.value: db.query(LabInstance).filter(LabInstance.status == status).count()
        for status in LabInstanceStatus
    }

    return {
        "errors_last_24h": int(error_events),
        "lab_instances": {k: int(v) for k, v in lab_counts.items()},
        "timestamp": now.isoformat(),
    }


