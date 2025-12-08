from pydantic import BaseModel

class UserCreate(BaseModel):
    email: str
    password: str
    full_name: str | None = None

class UserLogin(BaseModel):
    email: str
    password: str

class UserOut(BaseModel):
    id: int
    email: str
    full_name: str | None

    class Config:
        orm_mode = True
