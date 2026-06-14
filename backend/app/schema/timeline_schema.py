"""
Pydantic schemas for the Student Evidence Timeline API.

Kept in app/schema/ to match the existing project convention
(see app/schema/schemas.py) rather than creating a separate schemas/ folder.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel


class TimelineSeverity(str, Enum):
    positive = "positive"
    neutral  = "neutral"
    warning  = "warning"
    danger   = "danger"


class TimelineItemType(str, Enum):
    material_view            = "material_view"
    quiz_attempt             = "quiz_attempt"
    assignment_submission    = "assignment_submission"
    late_submission          = "late_submission"
    missed_deadline          = "missed_deadline"
    inactivity               = "inactivity"
    grade_update             = "grade_update"
    risk_change              = "risk_change"
    recommendation_generated = "recommendation_generated"
    quiz_generated           = "quiz_generated"
    sync_event               = "sync_event"
    unknown                  = "unknown"


class EvidenceTimelineItem(BaseModel):
    id:       str
    date:     datetime
    label:    str
    type:     str                               # TimelineItemType string — lenient for forward compat
    severity: TimelineSeverity
    source:   str
    metadata: Optional[dict[str, Any]] = None


class TimelineSummary(BaseModel):
    total_events:     int
    risk_signals:     int
    positive_signals: int
    last_activity:    Optional[datetime] = None


class EvidenceTimelineResponse(BaseModel):
    student_id: str
    course_id:  Optional[str] = None
    timeline:   list[EvidenceTimelineItem]
    summary:    TimelineSummary