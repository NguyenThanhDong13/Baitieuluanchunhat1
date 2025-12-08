from fastapi import FastAPI
from app.db import Base, engine
from app.routers import auth, habits, logs

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Habit Tracker API")

app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(habits.router, prefix="/habits", tags=["Habits"])
app.include_router(logs.router, prefix="/logs", tags=["Logs"])

@app.get("/")
def root():
    return {"message": "Backend OK"}
