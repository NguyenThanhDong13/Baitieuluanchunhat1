from fastapi import APIRouter
import random

router = APIRouter()

QUOTES = [
    "Small steps every day lead to big results.",
    "Your future is created by what you do today.",
    "Success is the sum of small efforts repeated daily.",
    "Believe you can and you're halfway there."
]

@router.get("/")
def get_quote():
    return {"quote": random.choice(QUOTES)}
