# backend/app/schema/prediction_history_schema.py
"""
Pydantic schemas for the Prediction History & Trend API.

Mirrors the backend service layer (app/services/prediction_history.py) and
the frontend TypeScript types (PredictionHistoryPoint, PredictionTrendResponse
in front-end/src/lib/types.ts).
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel


class PredictionHistoryPoint(BaseModel):
    """A single performance-probability snapshot. Returned oldest-first."""
    date: datetime
    probability: float
    classification: str


class PredictionTrendResponse(BaseModel):
    """
    Comparison of the student's two most recent prediction snapshots.

    `hasEnoughData` is always present. All other fields are None when
    fewer than two snapshots exist (hasEnoughData=False).
    """
    hasEnoughData: bool
    direction: Optional[Literal["improving", "declining", "stable"]] = None
    deltaProbability: Optional[float] = None
    summary: Optional[str] = None
    fromProbability: Optional[float] = None
    toProbability: Optional[float] = None
    fromDate: Optional[datetime] = None
    toDate: Optional[datetime] = None