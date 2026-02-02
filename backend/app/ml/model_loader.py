import joblib
from pathlib import Path
from typing import Dict
from app.schemas.features import FeatureVector

class ModelLoader:
    def __init__(self):
        self.models: Dict[str, any] = {}
        self.load_models()

    def load_models(self):
        """
        Load all ML models from artifacts/
        """
        base_path = Path(__file__).parent / "artifacts"
        self.models['pass_fail'] = joblib.load(base_path / "pass_fail_model.pkl")
        self.models['risk'] = joblib.load(base_path / "risk_model.pkl")
        self.models['engagement'] = joblib.load(base_path / "engagement_model.pkl")

    def predict(self, features: FeatureVector) -> Dict[str, float]:
        """
        Given a FeatureVector, return model predictions
        """
        # Convert to dict & then to feature array in order expected by models
        feature_order = [
            "total_events", "active_days", "avg_daily_events",
            "total_time_spent_minutes", "avg_session_duration_minutes",
            "page_views", "quiz_attempts", "assignments_submitted",
            "avg_quiz_score_ratio", "submission_ratio", "days_since_last_activity"
        ]

        X = [[getattr(features, f) for f in feature_order]]

        # Predict probabilities or scores
        pass_prob = self.models['pass_fail'].predict_proba(X)[0][1]  # assuming binary classifier
        risk_score = self.models['risk'].predict(X)[0]               # can be 0,1,2 etc
        engagement_score = self.models['engagement'].predict(X)[0]   # numeric score

        return {
            "pass_probability": float(pass_prob),
            "risk_level": int(risk_score),
            "engagement_score": float(engagement_score)
        }
