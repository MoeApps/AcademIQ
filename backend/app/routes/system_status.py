from fastapi import APIRouter

from app.services.system_status_service import get_system_status

router = APIRouter(prefix="/api/system", tags=["System Status"])


@router.get("/status")
def system_status():
    return get_system_status()