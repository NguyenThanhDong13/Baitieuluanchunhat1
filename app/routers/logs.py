from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime

from app.db import get_db
from app.models.habit_log import HabitLog
from app.schemas.habit_log import HabitLogCreate
from app.models.user import User
from app.core.security import get_current_user

router = APIRouter()

# ======================= LẤY LOG THEO USER ==========================

@router.get("/")
def get_logs(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    return (
        db.query(HabitLog)
        .filter(HabitLog.user_id == user.id)
        .order_by(HabitLog.date.desc())
        .all()
    )


# ======================= TẠO LOG – CÓ USER =====================

@router.post("/")
def create_log(
    data: HabitLogCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    log = HabitLog(
        habit_id=data.habit_id,
        user_id=user.id,  
        date=datetime.utcnow(),
    )

    db.add(log)
    db.commit()
    db.refresh(log)
    return log