from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.habit import Habit
from app.schemas.habit import HabitCreate, HabitUpdate, HabitOut
from app.routers.auth import get_current_user
from app.models.user import User

router = APIRouter()


@router.get("/", response_model=list[HabitOut])
def get_habits(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    habits = db.query(Habit).filter(Habit.owner_id == current_user.id).all()
    return habits


@router.post("/", response_model=HabitOut)
def create_habit(
    habit_in: HabitCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    habit = Habit(
        title=habit_in.title,
        description=habit_in.description,
        is_active=habit_in.is_active,
        owner_id=current_user.id,
    )
    db.add(habit)
    db.commit()
    db.refresh(habit)
    return habit


@router.get("/{habit_id}", response_model=HabitOut)
def get_habit(
    habit_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    habit = (
        db.query(Habit)
        .filter(Habit.id == habit_id, Habit.owner_id == current_user.id)
        .first()
    )
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")
    return habit


@router.put("/{habit_id}", response_model=HabitOut)
def update_habit(
    habit_id: int,
    habit_update: HabitUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    habit = (
        db.query(Habit)
        .filter(Habit.id == habit_id, Habit.owner_id == current_user.id)
        .first()
    )
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")

    if habit_update.title is not None:
        habit.title = habit_update.title
    if habit_update.description is not None:
        habit.description = habit_update.description
    if habit_update.is_active is not None:
        habit.is_active = habit_update.is_active

    db.commit()
    db.refresh(habit)
    return habit


@router.delete("/{habit_id}")
def delete_habit(
    habit_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    habit = (
        db.query(Habit)
        .filter(Habit.id == habit_id, Habit.owner_id == current_user.id)
        .first()
    )
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")

    db.delete(habit)
    db.commit()
    return {"detail": "Habit deleted"}