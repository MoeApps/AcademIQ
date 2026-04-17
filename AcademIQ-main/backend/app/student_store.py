"""In-memory store for latest assessment per student (survives until process restart)."""
from typing import Dict, Optional, Any

STUDENT_RESULTS: Dict[str, dict] = {}


def store_student_result(
    student_id: str,
    features: dict,
    risk_cluster: Optional[int] = None,
    risk_cluster_encoded: Optional[int] = None,
    recommendation: Optional[str] = None,
) -> None:
    STUDENT_RESULTS[student_id] = {
        "features": features,
        "risk_cluster": risk_cluster,
        "risk_cluster_encoded": risk_cluster_encoded,
        "recommendation": recommendation,
    }


def get_student_result(student_id: str) -> Optional[dict]:
    return STUDENT_RESULTS.get(student_id)
