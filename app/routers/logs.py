from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.habit import Habit
from app.models.habit_log import HabitLog
from app.schemas.habit_log import HabitLogCreate, HabitLogOut
from app.routers.auth import get_current_user
from app.models.user import User

router = APIRouter()


def _get_habit_owned(db: Session, habit_id: int, user_id: int) -> Habit | None:
    return (
        db.query(Habit)
        .filter(Habit.id == habit_id, Habit.owner_id == user_id)
        .first()
    )


@router.get("/", response_model=list[HabitLogOut])
def list_logs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    logs = (
        db.query(HabitLog)
        .join(Habit, Habit.id == HabitLog.habit_id)
        .filter(Habit.owner_id == current_user.id)
        .all()
    )
    return logs


@router.post("/", response_model=HabitLogOut)
def create_log(
    log_in: HabitLogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    habit = _get_habit_owned(db, log_in.habit_id, current_user.id)
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")

    log = HabitLog(
        habit_id=log_in.habit_id,
        log_date=log_in.log_date,
        status=log_in.status,
        note=log_in.note,
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log
