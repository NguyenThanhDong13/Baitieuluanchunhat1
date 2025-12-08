from fastapi import FastAPI
from app.db import Base, engine
from app.routers import auth

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Habit Tracker API")

app.include_router(auth.router, prefix="/auth", tags=["Auth"])

@app.get("/")
def root():
    return {"message": "Habit Tracker API running"}
