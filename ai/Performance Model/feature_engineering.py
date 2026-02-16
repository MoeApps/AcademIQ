import numpy as np
import pandas as pd


def compute_engagement_features(df):
    df["activity_density"] = df["active_days"] / df["total_time_spent"]
    df["normalized_time"] = df["total_time_spent"] / df["active_days"]
    df["click_ratio"] = df["material_clicks"] / (df["all_clicks"] + 1)
    
    return df


def compute_consistency_features(df):
    df["quiz_variance"] = df["quiz_score_std"]
    df["assignment_variance"] = df["assignment_score_std"]

    df["consistency_score"] = 1 - (
        (df["quiz_variance"] + df["assignment_variance"]) / 2
    )

    return df


def compute_trend_feature(df):
    # assuming you already computed slope externally
    df["trend_score"] = 1 / (1 + np.exp(-df["final_grade"]))
    return df


def build_features(df):
    df = compute_engagement_features(df)
    df = compute_consistency_features(df)
    df = compute_trend_feature(df)

    return df
