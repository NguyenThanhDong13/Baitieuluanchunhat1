from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db import Base, engine
from app.routers import auth, habits, logs

# Tạo bảng
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Habit Tracker API")

# ====== CORS FIX ======
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],        # Cho phép mọi domain truy cập API
    allow_credentials=True,
    allow_methods=["*"],        # Quan trọng: cho phép OPTIONS
    allow_headers=["*"],
)
# =======================

# Router
app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(habits.router, prefix="/habits", tags=["Habits"])
app.include_router(logs.router, prefix="/logs", tags=["Logs"])

@app.get("/")
def root():
    return {"message": "Backend OK"}