 v"""
Train risk (KMeans) model from existing Datasets/phase2_risk_clusters.csv.
Uses the same 8 features as the backend FeaturesPayload. Does not modify the dataset.
Output: backend/app/ml/artifacts/risk_model.pkl, risk_scaler.pkl
Run from project root: python -m backend.app.ml.train_risk_model
"""
import joblib
import pandas as pd
from pathlib import Path
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

# Features that match backend FeaturesPayload (order matters for predict)
FEATURE_COLS = [
    "total_time_spent",
    "active_days",
    "access_frequency",
    "avg_quiz_score",
    "quiz_score_std",
    "avg_assignment_score",
    "late_submission_ratio",
    "avg_final_grade",
]

def main():
    # Paths: run from AcademIQ-main (project root)
    base = Path(__file__).resolve().parent
    project_root = base.parent.parent.parent  # backend/app/ml -> AcademIQ-main
    dataset_path = project_root / "Datasets" / "phase2_risk_clusters.csv"
    out_dir = base / "artifacts"
    out_dir.mkdir(exist_ok=True)

    if not dataset_path.exists():
        raise FileNotFoundError(f"Dataset not found: {dataset_path}")

    df = pd.read_csv(dataset_path)
    missing = set(FEATURE_COLS) - set(df.columns)
    if missing:
        raise ValueError(f"Dataset missing columns: {missing}")

    X = df[FEATURE_COLS].fillna(0)
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    kmeans = KMeans(n_clusters=3, random_state=42, n_init=10)
    kmeans.fit(X_scaled)

    joblib.dump(kmeans, out_dir / "risk_model.pkl")
    joblib.dump(scaler, out_dir / "risk_scaler.pkl")
    print(f"Saved risk_model.pkl and risk_scaler.pkl to {out_dir}")

if __name__ == "__main__":
    main()
