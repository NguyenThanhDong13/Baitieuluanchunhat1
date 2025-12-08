from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.models.user import User
from app.schemas.user import UserCreate, UserLogin, UserOut
from app.core.security import hash_password, verify_password, create_access_token

router = APIRouter()

# Dependency DB
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/register", response_model=UserOut)
def register(user: UserCreate, db: Session = Depends(get_db)):
    # check email trùng
    exists = db.query(User).filter(User.email == user.email).first()
    if exists:
        raise HTTPException(status_code=400, detail="Email đã tồn tại")

    new_user = User(
        full_name=user.full_name,
        email=user.email,
        password_hash=hash_password(user.password)
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.post("/login")
def login(user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if not db_user or not verify_password(user.password, db_user.password_hash):
        raise HTTPException(status_code=400, detail="Email hoặc mật khẩu sai")

    token = create_access_token({"sub": str(db_user.id)})

    return {"access_token": token, "token_type": "bearer"}