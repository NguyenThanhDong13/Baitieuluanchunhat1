# app/db.py
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# =====================================================
# DATABASE_URL:
#   - Local (không đặt biến môi trường) -> dùng SQLite: habit.db
#   - Khi deploy Render: đặt env DATABASE_URL = Postgres URL
#     ví dụ: postgresql+psycopg2://user:pass@host:5432/habitdb
# =====================================================
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./habit.db")

# Nếu dùng SQLite cần tham số check_same_thread
connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


# Dependency get_db
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
