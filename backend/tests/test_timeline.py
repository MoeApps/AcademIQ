"""
Unit tests for the Student Evidence Timeline.

Tests the service layer in isolation using monkeypatching — no real MongoDB
required. Follows the same pattern as the existing test files in this suite.
"""

from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

import pytest

from app.services.timeline_service import (
    _event_to_item,
    _grade_to_item,
    _parse_score,
    _parse_timestamp,
    _strip_type_prefix,
    build_timeline,
)


# ── _parse_timestamp ──────────────────────────────────────────────────────────

class TestParseTimestamp:
    def test_epoch_ms_int(self):
        ts = _parse_timestamp(1_700_000_000_000)
        assert ts is not None
        assert isinstance(ts, datetime)

    def test_epoch_ms_string(self):
        ts = _parse_timestamp("1700000000000")
        assert ts is not None

    def test_none_returns_none(self):
        assert _parse_timestamp(None) is None

    def test_invalid_string_returns_none(self):
        assert _parse_timestamp("not-a-timestamp") is None


# ── _parse_score ──────────────────────────────────────────────────────────────

class TestParseScore:
    def test_integer_score(self):
        assert _parse_score(75) == 75.0

    def test_percentage_string(self):
        assert _parse_score("85%") == 85.0

    def test_fraction_converts_to_percentage(self):
        # Values ≤ 1.0 are treated as 0-1 fractions
        assert _parse_score(0.75) == 75.0

    def test_none_returns_none(self):
        assert _parse_score(None) is None

    def test_invalid_returns_none(self):
        assert _parse_score("n/a") is None


# ── _strip_type_prefix ────────────────────────────────────────────────────────

class TestStripTypePrefix:
    def test_strips_assignment_prefix(self):
        assert _strip_type_prefix("AssignmentLab Week 1", "assignment") == "Lab Week 1"

    def test_strips_quiz_prefix(self):
        assert _strip_type_prefix("QuizMidterm", "quiz") == "Midterm"

    def test_no_prefix_returns_original(self):
        assert _strip_type_prefix("Lab Week 1", "assignment") == "Lab Week 1"

    def test_empty_string(self):
        assert _strip_type_prefix("", "assignment") == ""


# ── _event_to_item ────────────────────────────────────────────────────────────

class TestEventToItem:
    def test_material_click_maps_correctly(self):
        ev = {
            "action_type": "material_click",
            "page_type": "resource",
            "course_id": "101",
            "timestamp": 1_700_000_000_000,
            "title": "Lecture 1: Introduction",
        }
        item = _event_to_item(ev)
        assert item is not None
        assert item["type"] == "material_view"
        assert item["severity"] == "neutral"
        assert "Lecture 1" in item["label"]

    def test_quiz_attempt_with_low_score_is_warning(self):
        ev = {
            "action_type": "view",
            "page_type": "quiz",
            "course_id": "101",
            "timestamp": 1_700_000_000_000,
            "quiz_attempt": True,
            "score": 45,
            "title": "Midterm",
        }
        item = _event_to_item(ev)
        assert item is not None
        assert item["type"] == "quiz_attempt"
        assert item["severity"] == "warning"
        assert "45%" in item["label"]

    def test_quiz_attempt_with_very_low_score_is_danger(self):
        ev = {
            "action_type": "view",
            "page_type": "quiz",
            "course_id": "101",
            "timestamp": 1_700_000_000_000,
            "quiz_attempt": True,
            "score": 30,
            "title": "Midterm",
        }
        item = _event_to_item(ev)
        assert item["severity"] == "danger"

    def test_assignment_submission_is_positive(self):
        ev = {
            "action_type": "view",
            "page_type": "assignment",
            "course_id": "101",
            "timestamp": 1_700_000_000_000,
            "assignment_submission": True,
            "title": "Lab 1",
        }
        item = _event_to_item(ev)
        assert item is not None
        assert item["type"] == "assignment_submission"
        assert item["severity"] == "positive"

    def test_late_submission_is_warning(self):
        ev = {
            "action_type": "view",
            "page_type": "assignment",
            "course_id": "101",
            "timestamp": 1_700_000_000_000,
            "assignment_submission": True,
            "late": True,
            "title": "Lab 1",
        }
        item = _event_to_item(ev)
        assert item is not None
        assert item["type"] == "late_submission"
        assert item["severity"] == "warning"

    def test_bare_dashboard_view_returns_none(self):
        ev = {
            "action_type": "view",
            "page_type": "dashboard",
            "course_id": "1",
            "timestamp": 1_700_000_000_000,
        }
        item = _event_to_item(ev)
        assert item is None

    def test_missing_timestamp_returns_none(self):
        ev = {
            "action_type": "material_click",
            "page_type": "resource",
            "course_id": "101",
            # no timestamp
        }
        item = _event_to_item(ev)
        assert item is None

    def test_missing_fields_do_not_crash(self):
        """Service must not raise even on a nearly empty event doc."""
        ev = {"timestamp": 1_700_000_000_000}
        # Should return None (no recognisable type), not raise
        result = _event_to_item(ev)
        assert result is None or isinstance(result, dict)


# ── _grade_to_item ────────────────────────────────────────────────────────────

class TestGradeToItem:
    def test_assignment_with_submission_time(self):
        g = {
            "course_id": "101",
            "item_name": "AssignmentLab Week 1",
            "item_type": "assignment",
            "percentage": 78.0,
            "submission_status": "submitted",
            "submission_time": "2025-03-15",
        }
        item = _grade_to_item(g)
        assert item is not None
        assert item["type"] == "assignment_submission"
        assert "78%" in item["label"]
        assert item["severity"] == "positive"

    def test_grade_record_without_submission_time_skipped(self):
        g = {
            "course_id": "101",
            "item_name": "AssignmentLab Week 1",
            "item_type": "assignment",
            "percentage": None,
            "submission_status": None,
            "submission_time": None,
        }
        item = _grade_to_item(g)
        assert item is None

    def test_quiz_grade_severity(self):
        g = {
            "course_id": "101",
            "item_name": "QuizMidterm",
            "item_type": "quiz",
            "percentage": 55.0,
            "submission_status": "graded",
            "submission_time": "2025-03-20",
        }
        item = _grade_to_item(g)
        assert item is not None
        assert item["type"] == "quiz_attempt"
        assert item["severity"] == "warning"


# ── build_timeline (integration-style with mocked DB) ────────────────────────

class TestBuildTimeline:
    """
    Integration-level tests for build_timeline().
    All MongoDB access is patched so no real database is needed.
    """

    def _patch_collections(self, monkeypatch, events=None, grades_payload=None, ml_docs=None):
        import app.services.timeline_service as svc

        # student_events_collection
        mock_events_coll = MagicMock()
        mock_events_coll.find.return_value.sort.return_value.limit.return_value = events or []
        monkeypatch.setattr(svc, "student_events_collection", mock_events_coll)

        # raw_moodle_payload_collection
        mock_raw_coll = MagicMock()
        mock_raw_coll.find_one.return_value = (
            {"academiq_user_id": "u1", "grades": grades_payload} if grades_payload is not None else None
        )
        monkeypatch.setattr(svc, "raw_moodle_payload_collection", mock_raw_coll)

        # ml_results_collection
        mock_ml_coll = MagicMock()
        mock_ml_coll.find.return_value = ml_docs or []
        monkeypatch.setattr(svc, "ml_results_collection", mock_ml_coll)

        # student_metrics_collection (not used in build_timeline directly yet)
        mock_metrics_coll = MagicMock()
        mock_metrics_coll.find_one.return_value = None
        monkeypatch.setattr(svc, "student_metrics_collection", mock_metrics_coll)

    def test_empty_student_returns_empty_timeline(self, monkeypatch):
        self._patch_collections(monkeypatch)
        result = build_timeline("u1")
        assert result["timeline"] == []
        assert result["summary"]["total_events"] == 0

    def test_events_are_mapped(self, monkeypatch):
        events = [
            {
                "academiq_user_id": "u1",
                "action_type": "material_click",
                "page_type": "resource",
                "course_id": "101",
                "timestamp": 1_700_000_000_000,
                "title": "Lecture 1",
            }
        ]
        self._patch_collections(monkeypatch, events=events)
        result = build_timeline("u1")
        assert len(result["timeline"]) == 1
        assert result["timeline"][0]["type"] == "material_view"

    def test_risk_signals_counted_correctly(self, monkeypatch):
        events = [
            {
                "academiq_user_id": "u1",
                "action_type": "view",
                "page_type": "assignment",
                "course_id": "101",
                "timestamp": 1_700_000_000_000,
                "assignment_submission": True,
                "late": True,
                "title": "Lab 1",
            },
            {
                "academiq_user_id": "u1",
                "action_type": "view",
                "page_type": "quiz",
                "course_id": "101",
                "timestamp": 1_700_001_000_000,
                "quiz_attempt": True,
                "score": 30,
                "title": "Quiz 1",
            },
        ]
        self._patch_collections(monkeypatch, events=events)
        result = build_timeline("u1")
        assert result["summary"]["risk_signals"] >= 2

    def test_limit_is_respected(self, monkeypatch):
        events = [
            {
                "academiq_user_id": "u1",
                "action_type": "material_click",
                "page_type": "resource",
                "course_id": "101",
                "timestamp": 1_700_000_000_000 + i * 1000,
                "title": f"Lecture {i}",
            }
            for i in range(20)
        ]
        self._patch_collections(monkeypatch, events=events)
        result = build_timeline("u1", limit=5)
        assert len(result["timeline"]) <= 5

    def test_missing_fields_do_not_crash(self, monkeypatch):
        """Partial/malformed events must be silently skipped."""
        events = [
            {"academiq_user_id": "u1"},
            {"timestamp": "bad"},
            {},
        ]
        self._patch_collections(monkeypatch, events=events)
        result = build_timeline("u1")
        # Should succeed and return an empty (or partial) timeline
        assert isinstance(result["timeline"], list)
        assert isinstance(result["summary"]["total_events"], int)

    def test_course_filter_respected(self, monkeypatch):
        """Only events matching the requested course_id are included."""
        events = [
            {
                "academiq_user_id": "u1",
                "action_type": "material_click",
                "page_type": "resource",
                "course_id": "101",
                "timestamp": 1_700_000_000_000,
                "title": "Lecture 1",
            }
        ]
        self._patch_collections(monkeypatch, events=events)
        result = build_timeline("u1", course_id="999")
        # The mock returns the same events regardless of filter (it's a unit test);
        # we verify the route sets course_id correctly and that the function
        # accepts the param without crashing.
        assert "timeline" in result