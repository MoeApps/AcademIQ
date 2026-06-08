import os, json, warnings
import numpy as np
import pandas as pd
import joblib
import tensorflow as tf
warnings.filterwarnings('ignore')
tf.get_logger().setLevel('ERROR')

BASE_DIR         = os.path.dirname(os.path.abspath(__file__))
SCALER_PATH      = os.path.join(BASE_DIR, 'academIQ_scaler.pkl')
RISK_MODEL_PATH  = os.path.join(BASE_DIR, 'academIQ_risk_model.keras')
GRADE_MODEL_PATH = os.path.join(BASE_DIR, 'academIQ_grade_model.keras')
MAPPING_PATH     = os.path.join(BASE_DIR, 'cluster_mapping.json')

SKEWED_COLS = [
    'all_clicks', 'material_clicks', 'total_time_spent',
    'avg_daily_time', 'clicks_per_day',
]
FEATURE_COLS = [
    'all_clicks', 'active_days', 'access_frequency', 'material_clicks',
    'avg_quiz_score', 'quiz_attempts', 'avg_assignment_score',
    'assignment_submissions', 'total_time_spent',
    'avg_daily_time', 'clicks_per_day',
]

def map_grade(score):
    if score > 85:  return 'A'
    if score >= 70: return 'B'
    if score >= 55: return 'C'
    if score >= 50: return 'D'
    return 'F'

class StudentPredictor:
    def __init__(self):
        self.scaler      = joblib.load(SCALER_PATH)
        self.risk_model  = tf.keras.models.load_model(RISK_MODEL_PATH)
        self.grade_model = tf.keras.models.load_model(GRADE_MODEL_PATH)
        with open(MAPPING_PATH) as fp:
            mapping = json.load(fp)
        self._int_to_label = {int(k): v for k, v in mapping['risk_labels'].items()}
        print('AcademIQ models loaded.')

    def _preprocess(self, data):
        df = pd.DataFrame([data])
        df['avg_daily_time'] = df['total_time_spent'] / (df['active_days'] + 1)
        df['clicks_per_day'] = df['all_clicks']       / (df['active_days'] + 1)
        for col in SKEWED_COLS:
            if col in df.columns:
                df[col] = np.log1p(df[col])
        for col in FEATURE_COLS:
            if col not in df.columns:
                df[col] = 0.0
        X = df[FEATURE_COLS].values.astype('float32')
        return self.scaler.transform(X)

    def predict(self, student_data):
        X = self._preprocess(student_data)
        risk_probs   = self.risk_model.predict(X, verbose=0)
        risk_cluster = int(np.argmax(risk_probs, axis=1)[0])
        risk_label   = self._int_to_label.get(risk_cluster, 'Unknown')
        raw_grade    = float(self.grade_model.predict(X, verbose=0)[0][0])
        pred_grade   = round(float(np.clip(raw_grade, 0.0, 100.0)), 2)
        return {
            'risk_cluster'   : risk_cluster,
            'risk_label'     : risk_label,
            'predicted_grade': pred_grade,
            'grade_letter'   : map_grade(pred_grade),
        }

if __name__ == '__main__':
    predictor = StudentPredictor()
    samples = [
        {'all_clicks': 100, 'active_days': 5, 'access_frequency': 2,
         'material_clicks': 10, 'avg_quiz_score': 40, 'quiz_attempts': 2,
         'avg_assignment_score': 45, 'assignment_submissions': 1, 'total_time_spent': 200},
        {'all_clicks': 2000, 'active_days': 90, 'access_frequency': 20,
         'material_clicks': 250, 'avg_quiz_score': 90, 'quiz_attempts': 15,
         'avg_assignment_score': 92, 'assignment_submissions': 10, 'total_time_spent': 8000},
    ]
    for i, s in enumerate(samples):
        print(f'Student {i+1}:', predictor.predict(s))
