from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any


class RawMoodlePayload(BaseModel):
    student_id: Optional[str] = None
    clicks: int = 0
    lastActivity: int = 0
    sessions: List[Dict[str, Any]] = Field(default_factory=list)
    courses: Dict[str, Any] = Field(default_factory=dict)
