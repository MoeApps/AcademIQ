def generate_recommendations(row):
    recommendations = []

    if row["academic_strength"] < 0.6:
        recommendations.append(
            "Focus on improving quiz and assignment performance. Review weak topics."
        )

    if row["engagement_intensity"] < 0.5:
        recommendations.append(
            "Increase study time and interact more with course materials."
        )

    if row["consistency_score"] < 0.5:
        recommendations.append(
            "Maintain consistent weekly study habits to stabilize performance."
        )

    if row["trend_score"] < 0.4:
        recommendations.append(
            "Your recent performance is declining. Revisit recent material immediately."
        )

    return recommendations
