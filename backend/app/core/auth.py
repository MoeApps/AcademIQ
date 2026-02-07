"""
JWT auth with student / instructor roles (PAIS Phase 1).
Uses python-jose for encoding/decoding. Demo users: student, instructor.
"""
import os
from datetime import datetime, timedelta
from typing import Optional

from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

SECRET_KEY = os.getenv("PAIS_JWT_SECRET", "academiq-pais-dev-secret-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)

# Demo users: username -> (password_hash_placeholder, role). For 60% we use plain comparison.
DEMO_USERS = {
    "student": ("password123", "student"),
    "instructor": ("password123", "instructor"),
}


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def verify_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


def get_current_user_optional(token: Optional[str] = Depends(oauth2_scheme)) -> Optional[dict]:
    """Dependency: returns payload (sub=username, role=...) or None if no/invalid token."""
    if not token:
        return None
    payload = verify_token(token)
    return payload


def get_current_user_required(token: Optional[str] = Depends(oauth2_scheme)) -> dict:
    """Dependency: returns payload or 401."""
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    return payload


def require_role(role: str):
    """Dependency factory: require specific role."""
    def _require(payload: dict = Depends(get_current_user_required)) -> dict:
        if payload.get("role") != role:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"Role {role} required")
        return payload
    return _require
