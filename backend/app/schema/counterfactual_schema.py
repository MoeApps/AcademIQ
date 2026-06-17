# backend/app/schema/counterfactual_schema.py
"""
Pydantic schemas for the Counterfactual Recommendation API.

Kept in app/schema/ to match the existing project convention
(see app/schema/timeline_schema.py) rather than creating a separate
schemas/ folder.
"""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field

# Human-friendly labels for the 9 mutable behavioural features, reusing the
# icon/short text already established in performance_predict.RECOMMENDATION_MAP
# so the wording students see here is consistent with the Insights page.
FRIENDLY_LABELS: dict[str, str] = {
    "quiz_attempts": "Quiz attempts",
    "assignment_submissions": "Assignment submissions",
    "active_days": "Active days",
    "total_time_spent": "Total time spent",
    "all_clicks": "Platform activity",
    "access_frequency": "Access frequency",
    "material_clicks": "Material engagement",
    "procrastination_index": "Procrastination index",
    "late_submission_count": "Late submissions",
}


def friendly_label(feature: str) -> str:
    """Map a raw feature name to the human-readable label shown in the UI."""
    return FRIENDLY_LABELS.get(feature, feature.replace("_", " ").capitalize())


class CounterfactualChange(BaseModel):
    feature:      str
    from_:        float = Field(..., alias="from")
    to:           float
    change:       float
    friendlyLabel: str

    model_config = {"populate_by_name": True}


class CounterfactualResponse(BaseModel):
    status:              str
    originalProbability: float
    newProbability:       float
    probabilityGain:      float
    changesNeeded:        list[CounterfactualChange]
    heuristic:            bool = False
