/**
 * Behavioural-feature recommendation map, ported verbatim from the performance
 * model: `ai/Performance Model/performancemodel_v4.py` (Section 9,
 * `RECOMMENDATION_MAP`).
 *
 * PerformanceModel_v4 explains each prediction with SHAP and surfaces a
 * student's strongest *negative drivers* — controllable behavioural features
 * dragging down their predicted performance. Those drivers are what the UI
 * shows as "risk factors", and each maps to the model's canonical, actionable
 * recommendation here. Keeping this map in one place means the recommendation
 * text the student sees is exactly what the model prescribes, and updating the
 * model's guidance only touches this file.
 *
 * NOTE: v4 is not the final model — some artefacts are still missing — so the
 * mock data wires risk factors to these features by hand for now. When the live
 * backend returns the model's negative drivers, resolve each one's
 * recommendation through `recommendationFor`.
 */

/** Controllable behavioural features the v4 model can recommend acting on. */
export type PerformanceFeature =
  | "procrastination_index"
  | "late_submission_count"
  | "access_frequency"
  | "total_time_spent"
  | "quiz_attempts"
  | "material_clicks"
  | "active_days"
  | "assignment_submissions"
  | "behavioral_risk_score"
  | "engagement_consistency"
  | "clicks_per_day"
  | "time_per_click"
  | "all_clicks";

export interface Recommendation {
  /** Short headline summarising the issue. */
  short: string;
  /** Actionable guidance shown to the student. */
  action: string;
  /** Why this matters — the model's justification. */
  why: string;
}

export const RECOMMENDATION_MAP: Record<PerformanceFeature, Recommendation> = {
  procrastination_index: {
    short: "Procrastination is your biggest hurdle",
    action:
      "Break assignments into daily micro-tasks. Use the 2-minute rule: if a task takes under 2 minutes, do it now.",
    why: "High procrastination is the #1 behavioural predictor of low performance in your cohort.",
  },
  late_submission_count: {
    short: "Late submissions are costing you",
    action:
      "Set personal deadlines 48 hours before the official one. Enable calendar reminders.",
    why: "Each late submission significantly reduces your probability of high performance.",
  },
  access_frequency: {
    short: "Access the platform more regularly",
    action:
      "Log in at least once daily, even for 10 minutes. Consistency beats marathon sessions.",
    why: "Students who access the platform regularly outperform sporadic learners, even with the same total time.",
  },
  total_time_spent: {
    short: "Increase your total study time",
    action:
      "Add two 30-minute focused sessions per week. Use the Pomodoro technique (25 min on, 5 min off).",
    why: "You're spending significantly less time than high performers in your cohort.",
  },
  quiz_attempts: {
    short: "Practice quizzes more",
    action:
      "Attempt every available quiz at least twice — first without notes, then with. Focus on wrong answers.",
    why: "Active recall through quizzes is one of the most evidence-backed learning strategies.",
  },
  material_clicks: {
    short: "Engage more with course materials",
    action:
      "Read each module's materials before attempting assignments. Take brief notes on key concepts.",
    why: "Limited material interaction suggests gaps in foundational knowledge.",
  },
  active_days: {
    short: "Spread study across more days",
    action:
      "Study 5 days a week for 30 minutes rather than 2 days for 75 minutes.",
    why: "Spaced repetition — studying across days — dramatically improves long-term retention.",
  },
  assignment_submissions: {
    short: "Submit all assignments",
    action:
      "Prioritise completing every assignment, even if imperfect. A submitted assignment always scores better than none.",
    why: "Missing assignments compound into significant grade drops.",
  },
  behavioral_risk_score: {
    short: "High behavioural risk detected",
    action:
      "Address procrastination and late submissions together — they reinforce each other negatively.",
    why: "Your combined behavioural risk score places you in the bottom quartile of your cohort.",
  },
  engagement_consistency: {
    short: "Improve engagement consistency",
    action:
      "Avoid binge-studying before deadlines. Build a regular weekly study schedule.",
    why: "Consistent engagement predicts performance better than total time spent.",
  },
  clicks_per_day: {
    short: "Increase daily platform interaction",
    action:
      "Click through materials and resources actively during every study session.",
    why: "Daily active interaction signals deeper engagement than passive scrolling.",
  },
  time_per_click: {
    short: "Spend more time per interaction",
    action:
      "Slow down and read materials carefully rather than clicking through quickly.",
    why: "Meaningful time-on-task correlates with deeper understanding.",
  },
  all_clicks: {
    short: "Increase overall platform activity",
    action:
      "Explore more resources, forums, and supplementary materials each week.",
    why: "Total engagement volume is a strong proxy for learning effort.",
  },
};

/** The actionable recommendation text the model prescribes for a feature. */
export function recommendationFor(feature: PerformanceFeature): string {
  return RECOMMENDATION_MAP[feature].action;
}
