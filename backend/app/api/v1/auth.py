"""
Login endpoint: POST /auth/login with username/password, returns JWT with role.
"""
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from backend.app.core.auth import (
    DEMO_USERS,
    create_access_token,
    oauth2_scheme,
)

router = APIRouter(prefix="/auth", tags=["Auth"])


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str  # student | instructor


@router.post("/login", response_model=LoginResponse)
def login(req: LoginRequest):
    if req.username not in DEMO_USERS:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")
    pwd, role = DEMO_USERS[req.username]
    if req.password != pwd:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")
    token = create_access_token(data={"sub": req.username, "role": role})
    return LoginResponse(access_token=token, role=role)
