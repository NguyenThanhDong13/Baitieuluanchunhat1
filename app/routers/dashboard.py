from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.habit import Habit
from app.models.habit_log import HabitLog
from app.routers.auth import get_current_user

router = APIRouter()

@router.get("/")
def dashboard(db: Session = Depends(get_db), user=Depends(get_current_user)):
    habits = db.query(Habit).filter(Habit.user_id == user.id).all()

    result = []

    for h in habits:
        logs = db.query(HabitLog).filter(HabitLog.habit_id == h.id).all()

        total = len(logs)
        done = len([l for l in logs if l.status == "done"])
        missed = len([l for l in logs if l.status == "missed"])
        rate = round((done / total) * 100, 2) if total > 0 else 0

        result.append({
            "habit_id": h.id,
            "name": h.name,
            "done": done,
            "missed": missed,
            "completion_rate": f"{rate}%"
        })

    return {
        "user": user.full_name,
        "summary": result,
    }
