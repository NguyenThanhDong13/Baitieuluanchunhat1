from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db import get_db
from app.models.habit_log import HabitLog
from app.core.security import get_current_user
from datetime import datetime, timedelta

router = APIRouter()

@router.get("/month")
def monthly_progress(db: Session = Depends(get_db), user = Depends(get_current_user)):

    today = datetime.utcnow().date()
    month_start = today.replace(day=1)
    month_end = (month_start + timedelta(days=32)).replace(day=1)

    logs = db.query(HabitLog).filter(
        HabitLog.user_id == user.id,
        HabitLog.date >= month_start,
        HabitLog.date < month_end
    ).all()

    completed_days = len(set([log.date.date() for log in logs]))

    total_days = (today - month_start).days + 1

    progress = int((completed_days / total_days) * 100) if total_days > 0 else 0

    return {
        "completed_days": completed_days,
        "total_days": total_days,
        "progress_percent": progress
    }