from datetime import datetime, date

from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from app.db import Base


class HabitLog(Base):
    __tablename__ = "habit_logs"

    id = Column(Integer, primary_key=True, index=True)
    habit_id = Column(Integer, ForeignKey("habits.id"), nullable=False)

    log_date = Column(Date, default=date.today, index=True)
    status = Column(String, default="done")      # done / skipped / missed...
    note = Column(String, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    habit = relationship("Habit", back_populates="logs")