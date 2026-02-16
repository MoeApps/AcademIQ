import joblib
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error, r2_score

from feature_engineering import build_features
from target_builder import build_performance_target


def train():
    df = pd.read_csv("Datasets/data/academIQ_train.csv")

    df = build_features(df)
    df = build_performance_target(df)

X = df.drop(columns=[
    "performance_target",
    "academic_strength",
    "engagement_intensity"
    "final_grade"
])
    y = df["performance_target"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    model = Ridge(alpha=1.0)
    model.fit(X_train_scaled, y_train)

    preds = model.predict(X_test_scaled)

    mae = mean_absolute_error(y_test, preds)
    rmse = np.sqrt(mean_squared_error(y_test, preds))
    r2 = r2_score(y_test, preds)

    print("MAE:", mae)
    print("RMSE:", rmse)
    print("R2:", r2)
#No negative scores / No scores > 100


    print("Predictions min:", preds.min())
    print("Predictions max:", preds.max())
    print("True min:", y_test.min())
    print("True max:", y_test.max())

    print("Correlation with final_grade:",
      df["performance_target"].corr(df["final_grade"])) #0.6 – 0.8 correlation  If > 0.9: Your performance score is just grade rebranded.

    print("Prediction correlation with final_grade:",
      pd.Series(preds).corr(df.loc[y_test.index, "final_grade"]))


    residuals = y_test - preds
print("Residual mean:", residuals.mean())
print("Residual std:", residuals.std())

    importance = pd.Series(model.coef_, index=X.columns)
print(importance.sort_values(ascending=False))


from collections import Counter

all_recs = []
for _, row in df.iterrows():
    recs = generate_recommendations(row)
    all_recs.extend(recs)

print(Counter(all_recs)) #If 90% of students get same recommendation: then bad thresholds


    joblib.dump(model, "models/performance_model.pkl")
    joblib.dump(scaler, "models/scaler.pkl")


if __name__ == "__main__":
    train()
