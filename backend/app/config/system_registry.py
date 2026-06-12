from copy import deepcopy
from datetime import datetime, timezone
from typing import Any, Dict


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


_SYSTEM_REGISTRY: Dict[str, Dict[str, Any]] = {
    "performance_model": {
        "loaded": False,
        "available": False,
        "status": "Not checked",
        "details": "Performance model has not been checked yet.",
        "updated_at": None,
    },
    "shap_explainer": {
        "loaded": False,
        "available": False,
        "status": "Not checked",
        "details": "SHAP explainer has not been checked yet.",
        "updated_at": None,
    },
    "grade_prediction_model": {
        "loaded": False,
        "available": False,
        "status": "Not checked",
        "details": "Grade prediction model has not been checked yet.",
        "updated_at": None,
    },
    "risk_cluster_model": {
        "loaded": False,
        "available": False,
        "status": "Not checked",
        "details": "Risk cluster model has not been checked yet.",
        "updated_at": None,
    },
    "quiz_generator": {
        "loaded": False,
        "available": False,
        "status": "Not checked",
        "details": "Quiz generator has not been checked yet.",
        "updated_at": None,
    },
}


def mark_component(name: str, ok: bool, details: str = "") -> None:
    if name not in _SYSTEM_REGISTRY:
        _SYSTEM_REGISTRY[name] = {}

    if name == "quiz_generator":
        status_text = "Available" if ok else "Not available"
    else:
        status_text = "Loaded" if ok else "Not ready"

    _SYSTEM_REGISTRY[name].update(
        {
            "loaded": bool(ok),
            "available": bool(ok),
            "status": status_text,
            "details": details or status_text,
            "updated_at": _now_iso(),
        }
    )


def get_registry_snapshot() -> Dict[str, Dict[str, Any]]:
    return deepcopy(_SYSTEM_REGISTRY)