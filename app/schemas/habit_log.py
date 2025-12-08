from pydantic import BaseModel
from datetime import datetime

class HabitLogCreate(BaseModel):
    habit_id: int
    date: str  # YYYY-MM-DD

class HabitLogOut(BaseModel):
    id: int
    habit_id: int
    date: datetime

    class Config:
        from_attributes = True
