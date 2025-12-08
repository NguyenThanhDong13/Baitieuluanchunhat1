from fastapi import FastAPI

from app.db import Base, engine
from app.routers import auth, habits, logs, dashboard

# ============================================
# Khởi tạo database (tạo bảng nếu chưa có)
# ============================================
Base.metadata.create_all(bind=engine)

# ============================================
# Khởi tạo FastAPI
# ============================================
app = FastAPI(
    title="Habit Tracker API",
    description="API for tracking habits, logs, dashboard analytics",
    version="1.0.0"
)

# ============================================
# Đăng ký router
# ============================================
app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(habits.router, prefix="/habits", tags=["Habits"])
app.include_router(logs.router, prefix="/logs", tags=["Habit Logs"])
app.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])

# ============================================
# API test server
# ============================================
@app.get("/")
def root():
    return {"message": "Habit Tracker API running successfully"}
