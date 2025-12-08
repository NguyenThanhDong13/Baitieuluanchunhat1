from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordBearer
from app.db import SessionLocal
from app.models.habit import Habit
from app.schemas.habit import HabitCreate, HabitOut
from app.core.security import get_current_user
from app.models.user import User

router = APIRouter()
oauth2 = OAuth2PasswordBearer(tokenUrl="/auth/login")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def current_user(token: str = Depends(oauth2), db: Session = Depends(get_db)):
    from app.core.security import SECRET_KEY, ALGORITHM
    from jose import jwt

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload.get("sub"))
        user = db.query(User).filter(User.id == user_id).first()
        return user
    except:
        raise HTTPException(status_code=401, detail="Token lỗi hoặc hết hạn")

@router.get("/", response_model=list[HabitOut])
def get_habits(db: Session = Depends(get_db), user=Depends(current_user)):
    return db.query(Habit).filter(Habit.user_id == user.id).all()

@router.post("/", response_model=HabitOut)
def create_habit(habit: HabitCreate, db: Session = Depends(get_db), user=Depends(current_user)):
    new_habit = Habit(
        name=habit.name,
        description=habit.description,
        user_id=user.id
    )
    db.add(new_habit)
    db.commit()
    db.refresh(new_habit)
    return new_habit

@router.delete("/{habit_id}")
def delete_habit(habit_id: int, db: Session = Depends(get_db), user=Depends(current_user)):
    habit = db.query(Habit).filter(Habit.id == habit_id, Habit.user_id == user.id).first()
    if not habit:
        raise HTTPException(status_code=404, detail="Không tìm thấy thói quen")
    db.delete(habit)
    db.commit()
    return {"message": "Đã xoá"}
