from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.user import User
from app.schemas.auth import UserCreate, UserLogin, UserOut
from app.core.security import hash_password, verify_password, create_access_token

router = APIRouter()

@router.post("/register", response_model=UserOut)
def register(user: UserCreate, db: Session = Depends(get_db)):
    exist = db.query(User).filter(User.email == user.email).first()
    if exist:
        raise HTTPException(status_code=400, detail="Email already registered")

    new_user = User(
        email=user.email,
        full_name=user.full_name,
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
        raise HTTPException(status_code=400, detail="Invalid login")

    token = create_access_token({"sub": str(db_user.id)})
    return {"access_token": token, "token_type": "bearer"}
