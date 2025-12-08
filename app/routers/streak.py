from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import date, timedelta

from app.db import get_db
from app.models.habit import Habit
from app.models.habit_log import HabitLog
from app.routers.auth import get_current_user

router = APIRouter()

@router.get("/{habit_id}")
def get_streak(habit_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    habit = db.query(Habit).filter(Habit.id == habit_id, Habit.user_id == user.id).first()
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")

    logs = db.query(HabitLog).filter(HabitLog.habit_id == habit_id).order_by(HabitLog.log_date.desc()).all()

    if not logs:
        return {"current_streak": 0}

    streak = 0
    today = date.today()

    for log in logs:
        if log.log_date == today - timedelta(days=streak) and log.status == "done":
            streak += 1
        else:
            break

    return {"current_streak": streak}
