# backend/app/routes/auth.py
from fastapi import APIRouter, HTTPException, Depends
from jose import jwt, JWTError
from datetime import datetime, timedelta
from passlib.context import CryptContext
from app.config.database import users_collection

router = APIRouter(prefix="/api/auth", tags=["Auth"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = "your-secret-key"  # store in env
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60*24

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

@router.post("/login")
async def login(email: str, password: str):
    user = users_collection.find_one({"email": email})
    if not user or not pwd_context.verify(password, user["hashed_password"]):
        raise HTTPException(401, "Invalid credentials")
    token = create_access_token({"sub": user["student_id"], "role": user["role"]})
    return {"access_token": token, "token_type": "bearer"}