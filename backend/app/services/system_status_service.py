from __future__ import annotations

import importlib
from datetime import datetime, timezone
from typing import Any, Dict, Tuple

from app.config.database import client, system_events_collection
from app.config.system_registry import get_registry_snapshot, mark_component


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _to_iso(value: Any) -> str | None:
    if value is None:
        return None

    if isinstance(value, datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.isoformat()

    return str(value)


def _component(ok: bool, positive: str, negative: str, details: str) -> Dict[str, Any]:
    return {
        "connected": bool(ok),
        "loaded": bool(ok),
        "available": bool(ok),
        "status": positive if ok else negative,
        "details": details,
        "updated_at": _now_iso(),
    }


def _check_mongodb() -> Dict[str, Any]:
    try:
        client.admin.command("ping")
        return _component(
            True,
            "Connected",
            "Disconnected",
            "MongoDB responded successfully to ping.",
        )
    except Exception as exc:
        return _component(
            False,
            "Connected",
            "Disconnected",
            f"MongoDB ping failed: {exc}",
        )


def _check_extension_sync() -> Dict[str, Any]:
    try:
        doc = system_events_collection.find_one(
            {"type": "extension_sync"},
            sort=[("last_sync_at", -1)],
        )

        if not doc or not doc.get("last_sync_at"):
            return {
                "connected": False,
                "loaded": False,
                "available": False,
                "status": "No sync yet",
                "details": "No successful extension sync has been recorded yet.",
                "last_sync_at": None,
                "updated_at": _now_iso(),
            }

        return {
            "connected": True,
            "loaded": True,
            "available": True,
            "status": "Synced",
            "details": "The extension has synced data to AcademIQ.",
            "last_sync_at": _to_iso(doc.get("last_sync_at")),
            "student_id": doc.get("student_id"),
            "academiq_user_id": doc.get("academiq_user_id"),
            "updated_at": _now_iso(),
        }

    except Exception as exc:
        return {
            "connected": False,
            "loaded": False,
            "available": False,
            "status": "Sync status unavailable",
            "details": f"Could not read extension sync status: {exc}",
            "last_sync_at": None,
            "updated_at": _now_iso(),
        }


def _check_performance_and_shap() -> Tuple[Dict[str, Any], Dict[str, Any]]:
    try:
        module = importlib.import_module("app.services.performance_predict")
    except Exception as exc:
        msg = f"Could not import performance service: {exc}"
        mark_component("performance_model", False, msg)
        mark_component("shap_explainer", False, msg)
        return (
            _component(False, "Loaded", "Not ready", msg),
            _component(False, "Loaded", "Not ready", msg),
        )

    try:
        performance_loaded = getattr(module, "_calibrated_model", None) is not None
        shap_loaded = getattr(module, "_shap_explainer", None) is not None

        if not performance_loaded or not shap_loaded:
            load_artifacts = getattr(module, "load_artifacts", None)
            if callable(load_artifacts):
                load_artifacts()

        performance_loaded = getattr(module, "_calibrated_model", None) is not None
        shap_loaded = getattr(module, "_shap_explainer", None) is not None

        performance_details = (
            "Performance model artifacts are loaded in memory."
            if performance_loaded
            else "Performance model service imported, but model is not loaded."
        )

        shap_details = (
            "SHAP explainer is loaded in memory."
            if shap_loaded
            else "Performance service imported, but SHAP explainer is not loaded."
        )

        mark_component("performance_model", performance_loaded, performance_details)
        mark_component("shap_explainer", shap_loaded, shap_details)

        return (
            _component(performance_loaded, "Loaded", "Not ready", performance_details),
            _component(shap_loaded, "Loaded", "Not ready", shap_details),
        )

    except Exception as exc:
        msg = f"Performance/SHAP artifact check failed: {exc}"
        mark_component("performance_model", False, msg)
        mark_component("shap_explainer", False, msg)
        return (
            _component(False, "Loaded", "Not ready", msg),
            _component(False, "Loaded", "Not ready", msg),
        )


def _check_grade_and_risk() -> Tuple[Dict[str, Any], Dict[str, Any]]:
    try:
        module = importlib.import_module("app.services.grade_risk_predict")
    except Exception as exc:
        msg = f"Could not import grade/risk service: {exc}"
        mark_component("grade_prediction_model", False, msg)
        mark_component("risk_cluster_model", False, msg)
        return (
            _component(False, "Loaded", "Not ready", msg),
            _component(False, "Loaded", "Not ready", msg),
        )

    if not getattr(module, "TF_AVAILABLE", False):
        msg = "TensorFlow or grade/risk inference module is not available."
        mark_component("grade_prediction_model", False, msg)
        mark_component("risk_cluster_model", False, msg)
        return (
            _component(False, "Loaded", "Not ready", msg),
            _component(False, "Loaded", "Not ready", msg),
        )

    try:
        predictor = getattr(module, "_predictor", None)

        if predictor is None:
            get_predictor = getattr(module, "get_predictor", None)
            if callable(get_predictor):
                predictor = get_predictor()

        loaded = predictor is not None or getattr(module, "_predictor", None) is not None

        grade_details = (
            "Grade prediction model is loaded and ready."
            if loaded
            else "Grade prediction service is available, but predictor is not loaded."
        )

        risk_details = (
            "Risk cluster model is loaded and ready."
            if loaded
            else "Risk cluster service is available, but predictor is not loaded."
        )

        mark_component("grade_prediction_model", loaded, grade_details)
        mark_component("risk_cluster_model", loaded, risk_details)

        return (
            _component(loaded, "Loaded", "Not ready", grade_details),
            _component(loaded, "Loaded", "Not ready", risk_details),
        )

    except Exception as exc:
        msg = f"Grade/risk model check failed: {exc}"
        mark_component("grade_prediction_model", False, msg)
        mark_component("risk_cluster_model", False, msg)
        return (
            _component(False, "Loaded", "Not ready", msg),
            _component(False, "Loaded", "Not ready", msg),
        )


def _check_quiz_generator() -> Dict[str, Any]:
    try:
        quiz_gen = importlib.import_module("app.services.quiz_gen")
        ok = bool(quiz_gen.available())

        details = (
            "Quiz generator is available and ready."
            if ok
            else "Quiz generator service exists, but it is not ready."
        )

        mark_component("quiz_generator", ok, details)
        return _component(ok, "Available", "Not available", details)

    except Exception as exc:
        msg = f"Quiz generator check failed: {exc}"
        mark_component("quiz_generator", False, msg)
        return _component(False, "Available", "Not available", msg)


def get_system_status() -> Dict[str, Any]:
    performance_model, shap_explainer = _check_performance_and_shap()
    grade_prediction_model, risk_cluster_model = _check_grade_and_risk()
    quiz_generator = _check_quiz_generator()

    heuristic_fallback = not (
        performance_model.get("loaded")
        and grade_prediction_model.get("loaded")
        and risk_cluster_model.get("loaded")
    )

    return {
        "backend": {
            "connected": True,
            "loaded": True,
            "available": True,
            "status": "Connected",
            "details": "AcademIQ FastAPI backend is running.",
            "updated_at": _now_iso(),
        },
        "mongodb": _check_mongodb(),
        "extension_sync": _check_extension_sync(),
        "ai": {
            "performance_model": performance_model,
            "shap_explainer": shap_explainer,
            "grade_prediction_model": grade_prediction_model,
            "risk_cluster_model": risk_cluster_model,
            "quiz_generator": quiz_generator,
        },
        "runtime": {
            "frontend_mode": "Live Backend",
            "mock_mode": False,
            "heuristic_fallback": heuristic_fallback,
            "checked_at": _now_iso(),
        },
        "registry": get_registry_snapshot(),
    }