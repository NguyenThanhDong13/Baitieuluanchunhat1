from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordBearer
from datetime import datetime
from app.db import SessionLocal
from app.models.habit_log import HabitLog
from app.schemas.habit_log import HabitLogCreate, HabitLogOut
from app.core.security import SECRET_KEY, ALGORITHM
from app.models.user import User
from jose import jwt

router = APIRouter()
oauth2 = OAuth2PasswordBearer(tokenUrl="/auth/login")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def current_user(token: str = Depends(oauth2), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload.get("sub"))
        return db.query(User).filter(User.id == user_id).first()
    except:
        raise HTTPException(status_code=401, detail="Token lỗi hoặc hết hạn")

@router.get("/", response_model=list[HabitLogOut])
def get_logs(db: Session = Depends(get_db), user=Depends(current_user)):
    return db.query(HabitLog).all()

@router.post("/", response_model=HabitLogOut)
def create_log(log: HabitLogCreate, db: Session = Depends(get_db), user=Depends(current_user)):
    dt = datetime.fromisoformat(log.date)
    new_log = HabitLog(habit_id=log.habit_id, date=dt)
    db.add(new_log)
    db.commit()
    db.refresh(new_log)
    return new_log
