from datetime import date, datetime

from pydantic import BaseModel
from pydantic import ConfigDict


class HabitLogBase(BaseModel):
    log_date: date | None = None
    status: str = "done"
    note: str | None = None


class HabitLogCreate(HabitLogBase):
    habit_id: int


class HabitLogOut(HabitLogBase):
    id: int
    habit_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
