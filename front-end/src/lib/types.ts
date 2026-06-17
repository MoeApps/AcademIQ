/**
 * Shared domain types for AcademIQ.
 *
 * These mirror the shapes returned by the FastAPI backend, which in turn
 * aggregates data scraped/integrated from Moodle plus the ML model outputs.
 * Keeping them in one place means the mock client and a future real client
 * stay interchangeable.
 */

import type { PerformanceFeature } from "./recommendations";

export interface Student {
  id: string;
  username: string;
  fullName: string;
}

/** Account roles. Drives redirects and route protection. */
export type Role = "admin" | "student";

/**
 * An authenticated AcademIQ account (admin or student). Mirrors the backend's
 * `serialize_user` output — note the password hash is never sent to the client.
 */
export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  /** Moodle linkage identifiers (primary mapping keys; may be absent). */
  moodleUserId?: string | null;
  studentId?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

/** Result of a successful sign-in. */
export interface AuthResult {
  user: AuthUser;
  role: Role;
  /** Session token (also set as an httpOnly cookie by the backend). */
  token: string;
}

/** Payload for an admin creating or editing a user. */
export interface UserInput {
  fullName: string;
  email: string;
  role: Role;
  moodleUserId?: string | null;
  studentId?: string | null;
  /** Optional on create; if omitted the backend generates a secure password. */
  password?: string;
}

/** Admin mutation result; `generatedPassword` is present only when generated. */
export interface UserMutationResult {
  user: AuthUser;
  generatedPassword?: string;
}

export interface Course {
  id: string;
  name: string;
  /** Short code shown in compact UI, e.g. "CS204". */
  code: string;
}

/** Four-level burnout classification from the burnout-detection model. */
export type BurnoutLevel = "Safe" | "Low Risk" | "Medium Risk" | "High Risk";

/** Categorical label from the student-clustering model. */
export type PerformanceStatus = "Good" | "Average" | "At Risk";

/** Dashboard quick-statistics card (across ALL enrolled courses). */
export interface DashboardStats {
  /** Average score across all instructor-graded Moodle tasks (0-100). */
  averageScore: number;
  /** Average task-completion percentage (0-100). */
  averageCompletion: number;
  enrolledCourses: number;
}

/** A single point on the weekly study-time trend (last 3 weeks). */
export interface StudyTimePoint {
  /** Human label for the week, e.g. "Week of May 12". */
  label: string;
  /** Study time for that week, in hours. */
  hours: number;
}

/** Burnout card data — derived from TOTAL study time across all courses. */
export interface BurnoutStatus {
  level: BurnoutLevel;
  message: string;
}

export interface DashboardData {
  student: Student;
  stats: DashboardStats;
  studyTime: StudyTimePoint[];
  burnout: BurnoutStatus;
}

/** Breakdown of a task type (quizzes or assignments) within a course. */
export interface TaskBreakdown {
  attempted: number;
  total: number;
  /** Average score on attempted tasks (0-100). */
  averageScore: number;
}

/** Per-course statistics shown on the Performance Analysis page. */
export interface CourseStatistics {
  quizzes: TaskBreakdown;
  assignments: TaskBreakdown;
  /** Total time spent on the course, in hours. */
  totalTimeHours: number;
  /** Weekly-average study time on the course, in hours. */
  weeklyAverageHours: number;
}

/** Course-scoped output combining grade prediction + clustering + actuals. */
export interface PerformanceAnalysis {
  course: Course;
  /**
   * Numeric grade (0-100). Null when neither the grade model nor real
   * gradebook data is available for this course yet.
   */
  predictedGrade: number | null;
  /** Categorical status from the behavioural clustering model. */
  status: PerformanceStatus;
  /** "overall" = global behavioural model; "course" = derived from course grades. */
  statusScope?: "overall" | "course";
  /** Student's actual current average across graded Moodle tasks (0-100). */
  courseAverage: number;
  statistics: CourseStatistics;
}

/**
 * A single ranked risk factor — a SHAP "negative driver" surfaced by
 * PerformanceModel_v4 (see `lib/recommendations.ts`).
 */
export interface RiskFactor {
  title: string;
  description: string;
  /** Relative impact on predicted performance (0-100), used for ranking. */
  impact: number;
  /**
   * The v4 behavioural feature this driver corresponds to, when known. Used to
   * resolve the model's canonical recommendation; the live backend may instead
   * send `recommendation` directly.
   */
  feature?: PerformanceFeature;
  /**
   * Actionable, model-generated guidance addressing this specific factor —
   * the `action` text from the v4 recommendation map for `feature`.
   */
  recommendation: string;
}

/** Specific Insights page payload for a course. */
export interface CourseInsights {
  course: Course;
  /** Whether the student is currently a high performer for this course. */
  isHighPerformer: boolean;
  classificationSummary: string;
  /** Risk factors, expected pre-sorted by impact (highest first). */
  riskFactors: RiskFactor[];
}

/** A learning material title scraped from Moodle, selectable for quiz gen. */
export interface LearningMaterial {
  id: string;
  title: string;
  /** e.g. "PDF", "Slides", "Notes". */
  kind: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  /** Index into `options`. */
  correctIndex: number;
}

export interface GeneratedQuiz {
  courseId: string;
  /** Material ids the quiz was generated from. */
  materialIds: string[];
  questions: QuizQuestion[];
}

// ── Evidence Timeline ──────────────────────────────────────────────────────────

export type TimelineSeverity = "positive" | "neutral" | "warning" | "danger";

export interface EvidenceTimelineItem {
  id: string;
  /** ISO 8601 datetime string from the backend. */
  date: string;
  /** Human-readable label, e.g. "Submitted assignment: Lab Week 1 — 78%". */
  label: string;
  /** Discriminator string used for icon/colour selection. */
  type: string;
  severity: TimelineSeverity;
  /** "moodle_event" | "moodle_grade" | "ai_result" | "generated" */
  source: string;
  metadata?: Record<string, unknown>;
}

export interface EvidenceTimelineSummary {
  total_events: number;
  risk_signals: number;
  positive_signals: number;
  last_activity?: string | null;
}

export interface EvidenceTimelineResponse {
  student_id: string;
  course_id?: string | null;
  timeline: EvidenceTimelineItem[];
  summary: EvidenceTimelineSummary;
}

// ── Counterfactual Recommendation Engine ────────────────────────────────────

/**
 * A single "what would need to change" recommendation from the
 * counterfactual engine. Mirrors the backend's CounterfactualChange schema
 * (note: `from` is a reserved word in some contexts but is valid as a
 * TypeScript object key).
 */
export interface CounterfactualChange {
  feature: string;
  /** The student's current value for this feature. */
  from: number;
  /** The target value (high-performer cohort median) for this feature. */
  to: number;
  /** to - from, signed. */
  change: number;
  /** Human-readable label, e.g. "Quiz attempts". */
  friendlyLabel: string;
}

/**
 * Response shape for GET /counterfactual.
 *
 * Answers: "What is the minimum behavioural change needed for this student
 * to flip from Not High Performer to High Performer?" This is a
 * what-if projection from the trained model, not a guarantee.
 */
export interface CounterfactualResponse {
  /**
   * One of: "Already classified as High Performer", "Flip achieved",
   * "Partial improvement".
   */
  status: string;
  /** The student's current predicted probability of being a High Performer (0-1). */
  originalProbability: number;
  /** Projected probability after applying changesNeeded (0-1). */
  newProbability: number;
  /** newProbability - originalProbability. */
  probabilityGain: number;
  /** Empty when status is "Already classified as High Performer". */
  changesNeeded: CounterfactualChange[];
  heuristic: boolean;
}