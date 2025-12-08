from pydantic import BaseModel

class UserCreate(BaseModel):
    full_name: str
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserOut(BaseModel):
    id: int
    full_name: str
    email: str

    class Config:
        from_attributes = True
