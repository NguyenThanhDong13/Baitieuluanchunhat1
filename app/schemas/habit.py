from pydantic import BaseModel

class HabitCreate(BaseModel):
    name: str
    description: str | None = None

class HabitOut(BaseModel):
    id: int
    name: str
    description: str | None

    class Config:
        from_attributes = True
