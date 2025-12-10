import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.db import Base, engine
from app.routers import auth, habits, logs, progress

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Habit Tracker API")

# ===== CORS =====
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ===== TÍNH ĐƯỜNG DẪN =====
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")

# ===== STATIC =====
app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")

# ===== PAGES =====
@app.get("/")
def serve_index():
    return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))

@app.get("/dashboard")
def serve_dashboard():
    return FileResponse(os.path.join(FRONTEND_DIR, "dashboard.html"))

@app.get("/habits")
def serve_habits():
    return FileResponse(os.path.join(FRONTEND_DIR, "habits.html"))

@app.get("/logs")
def serve_logs():
    return FileResponse(os.path.join(FRONTEND_DIR, "logs.html"))

# ===== APIs =====
app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(habits.router, prefix="/habits", tags=["Habits"])
app.include_router(logs.router, prefix="/logs", tags=["Logs"])
app.include_router(progress.router, prefix="/progress", tags=["Progress"])
