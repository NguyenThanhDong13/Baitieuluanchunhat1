from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.habit import Habit
from app.schemas.habit import HabitCreate, HabitOut
from app.core.security import get_current_user
from app.models.user import User

router = APIRouter()


# ===================== LẤY DANH SÁCH HABIT ======================
@router.get("/", response_model=list[HabitOut])
def get_habits(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    return db.query(Habit).filter(Habit.user_id == user.id).all()


# ======================== TẠO HABIT =============================
@router.post("/", response_model=HabitOut)
def create_habit(
    habit: HabitCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    new_habit = Habit(
        name=habit.name,
        description=habit.description,
        user_id=user.id
    )
    db.add(new_habit)
    db.commit()
    db.refresh(new_habit)
    return new_habit


# ======================== XOÁ HABIT =============================
@router.delete("/{habit_id}")
def delete_habit(
    habit_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):

    habit = (
        db.query(Habit)
        .filter(Habit.id == habit_id, Habit.user_id == user.id)
        .first()
    )

    if not habit:
        raise HTTPException(status_code=404, detail="Không tìm thấy thói quen")

    db.delete(habit)
    db.commit()

    return {"message": "Đã xoá"}