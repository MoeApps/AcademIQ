import sys
import unittest
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
ROOT = BACKEND.parent
sys.path[:0] = [str(BACKEND), str(ROOT)]

from app.extension_ingest import compute_features_from_extension  # noqa: E402


class TestExtensionIngest(unittest.TestCase):
    def test_student_and_time(self):
        data = {
            "student": {"student_id": "stu_test"},
            "courses": [
                {"course_id": "666", "total_visits": 2, "total_time_spent_seconds": 16},
                {"course_id": "1", "total_visits": 3, "total_time_spent_seconds": 34},
            ],
            "behavior": {"active_days_count": 1, "total_time_spent_on_moodle": 69},
            "grades": [],
        }
        features, sid = compute_features_from_extension(data)
        self.assertEqual(sid, "stu_test")
        self.assertGreaterEqual(features["total_time_spent"], 69000.0)
        self.assertEqual(features["active_days"], 1.0)
        for k in (
            "access_frequency",
            "avg_quiz_score",
            "quiz_score_std",
            "avg_assignment_score",
            "late_submission_ratio",
            "avg_final_grade",
        ):
            self.assertIn(k, features)


if __name__ == "__main__":
    unittest.main()
