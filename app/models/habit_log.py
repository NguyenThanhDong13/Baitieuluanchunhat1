from sqlalchemy import Column, Integer, ForeignKey, DateTime
from datetime import datetime
from app.db import Base

class HabitLog(Base):
    __tablename__ = "habit_logs"

    id = Column(Integer, primary_key=True, index=True)
    habit_id = Column(Integer, ForeignKey("habits.id"))
    date = Column(DateTime, default=datetime.utcnow)
