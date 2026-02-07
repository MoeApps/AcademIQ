/**
 * Backend API base URL. Use env VITE_API_URL or default to localhost:8000.
 */
export const API_BASE =
  (typeof import.meta !== "undefined" && (import.meta as unknown as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL) ||
  "http://localhost:8000";

export type Role = "student" | "instructor";

export interface LoginResponse {
  access_token: string;
  token_type: string;
  role: Role;
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Login failed" }));
    throw new Error(err.detail || "Login failed");
  }
  return res.json();
}

export function getStoredToken(): string | null {
  return localStorage.getItem("pais_token");
}

export function getStoredRole(): Role | null {
  const r = localStorage.getItem("pais_role");
  return r === "student" || r === "instructor" ? r : null;
}

export function setStoredAuth(token: string, role: Role): void {
  localStorage.setItem("pais_token", token);
  localStorage.setItem("pais_role", role);
}

export function clearStoredAuth(): void {
  localStorage.removeItem("pais_token");
  localStorage.removeItem("pais_role");
}

/** Fetch with Bearer token when available. */
export function authFetch(url: string, init?: RequestInit): Promise<Response> {
  const token = getStoredToken();
  const headers = new Headers(init?.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(url.startsWith("http") ? url : `${API_BASE}${url}`, { ...init, headers });
}

// ---------- Student profile & predictions (PAIS) ----------
export interface StudentProfile {
  student_id: string;
  strong_topics: { course_id: string; name: string; grade: number }[];
  weak_topics: { course_id: string; name: string; grade: number }[];
  risk_level: string;
  risk_cluster: number;
  engagement_level: string;
  learning_style_cluster: number;
}

export interface StudentPredictions {
  student_id: string;
  risk_cluster: number;
  risk_level: string;
  recommendation: string;
}

export async function fetchStudentProfile(studentId: string): Promise<StudentProfile | null> {
  const res = await authFetch(`/api/v1/students/${studentId}/profile`);
  if (!res.ok) return null;
  return res.json();
}

export async function fetchStudentPredictions(studentId: string): Promise<StudentPredictions | null> {
  const res = await authFetch(`/api/v1/students/${studentId}/predictions`);
  if (!res.ok) return null;
  return res.json();
}

export interface ExplainResponse {
  student_id: string;
  risk_level: string;
  risk_cluster: number;
  reasons: string[];
  summary: string;
}

export async function fetchStudentExplain(studentId: string): Promise<ExplainResponse | null> {
  const res = await authFetch(`/api/v1/students/${studentId}/explain`);
  if (!res.ok) return null;
  return res.json();
}

// ---------- Instructor ----------
export interface AtRiskStudent {
  student_id: string;
  risk_level: string;
  risk_cluster: number;
  reason: string;
}

export interface InstructorAtRiskResponse {
  at_risk: AtRiskStudent[];
  count: number;
}

export interface InstructorAnalyticsResponse {
  risk_distribution: { "Low Risk": number; "Medium Risk": number; "High Risk": number };
  grade_summary: {
    average_final_grade: number;
    pass_count: number;
    fail_count: number;
    total_records: number;
  };
}

export async function fetchInstructorAtRisk(): Promise<InstructorAtRiskResponse | null> {
  const res = await authFetch("/api/v1/instructor/at-risk");
  if (!res.ok) return null;
  return res.json();
}

export async function fetchInstructorAnalytics(): Promise<InstructorAnalyticsResponse | null> {
  const res = await authFetch("/api/v1/instructor/analytics");
  if (!res.ok) return null;
  return res.json();
}

// ---------- Courses & grades (for dashboard, no mock) ----------
export interface CourseApi {
  id: number;
  course_id: string;
  course_name: string | null;
  semester: string | null;
}

export interface GradeApi {
  id: number;
  student_id: string;
  course_id: string;
  final_grade: number | null;
  status: string | null;
}

export interface CourseStatsApi {
  submittedAssignments: number;
  totalAssignments: number;
  avgAssignmentGrade: number;
  completedQuizzes: number;
  totalQuizzes: number;
  avgQuizGrade: number;
  timeSpentHours: number;
}

export async function fetchCourses(): Promise<CourseApi[]> {
  const res = await authFetch("/api/v1/courses");
  if (!res.ok) return [];
  return res.json();
}

export async function fetchGradesByStudent(studentId: string): Promise<GradeApi[]> {
  const res = await authFetch(`/api/v1/grades/${studentId}`);
  if (!res.ok) return [];
  return res.json();
}

export async function fetchCourseStats(studentId: string, courseId: string): Promise<CourseStatsApi | null> {
  const res = await authFetch(`/api/v1/students/${studentId}/courses/${courseId}/stats`);
  if (!res.ok) return null;
  return res.json();
}
