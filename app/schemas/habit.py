from datetime import datetime

from pydantic import BaseModel
from pydantic import ConfigDict


class HabitBase(BaseModel):
    title: str
    description: str | None = None
    is_active: bool = True


class HabitCreate(HabitBase):
    pass


class HabitUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    is_active: bool | None = None


class HabitOut(HabitBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)