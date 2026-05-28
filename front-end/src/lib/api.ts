import {
  getMockInsights,
  getMockMaterials,
  getMockPerformance,
  getMockQuiz,
  mockCourses,
  mockDashboard,
  mockStudent,
} from "./mock";
import type {
  Course,
  CourseInsights,
  DashboardData,
  GeneratedQuiz,
  LearningMaterial,
  PerformanceAnalysis,
  Student,
} from "./types";

/**
 * Single seam between the UI and the data layer.
 *
 * Today every call resolves against the mock data in `mock.ts`. To switch to
 * the live FastAPI backend, set NEXT_PUBLIC_API_BASE_URL (and leave
 * NEXT_PUBLIC_USE_MOCK unset / "false"); each method then performs the real
 * fetch shown in its `// LIVE:` comment. The UI never changes.
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
const USE_MOCK =
  process.env.NEXT_PUBLIC_USE_MOCK === "true" || BASE_URL === "";

/** Simulate network latency so loading states are exercised in dev. */
function delay<T>(value: T, ms = 400): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`Request failed (${res.status}): ${path}`);
  }
  return res.json() as Promise<T>;
}

export interface SignInResult {
  student: Student;
}

export const api = {
  /** Validate Moodle-sourced credentials via the backend. */
  async signIn(username: string, _password: string): Promise<SignInResult> {
    if (USE_MOCK) {
      return delay({ student: { ...mockStudent, username } });
    }
    // LIVE: return request("/auth/signin", { method: "POST", body: JSON.stringify({ username, password: _password }) });
    return request<SignInResult>("/auth/signin", {
      method: "POST",
      body: JSON.stringify({ username, password: _password }),
    });
  },

  /** Courses the student is enrolled in on Moodle. */
  async getCourses(): Promise<Course[]> {
    if (USE_MOCK) return delay(mockCourses);
    return request<Course[]>("/courses");
  },

  /** Dashboard aggregates across all enrolled courses. */
  async getDashboard(): Promise<DashboardData> {
    if (USE_MOCK) return delay(mockDashboard);
    return request<DashboardData>("/dashboard");
  },

  /** Course-scoped grade prediction, status, average, and statistics. */
  async getPerformance(courseId: string): Promise<PerformanceAnalysis> {
    if (USE_MOCK) return delay(getMockPerformance(courseId));
    return request<PerformanceAnalysis>(`/courses/${courseId}/performance`);
  },

  /** Classification + ranked risk factors for a course. */
  async getInsights(courseId: string): Promise<CourseInsights> {
    if (USE_MOCK) return delay(getMockInsights(courseId));
    return request<CourseInsights>(`/courses/${courseId}/insights`);
  },

  /** Learning-material titles scraped from Moodle for a course. */
  async getMaterials(courseId: string): Promise<LearningMaterial[]> {
    if (USE_MOCK) return delay(getMockMaterials(courseId));
    return request<LearningMaterial[]>(`/courses/${courseId}/materials`);
  },

  /** Generate a quiz scoped strictly to the selected materials. */
  async generateQuiz(
    courseId: string,
    materialIds: string[],
  ): Promise<GeneratedQuiz> {
    if (USE_MOCK) return delay(getMockQuiz(courseId, materialIds), 900);
    return request<GeneratedQuiz>(`/courses/${courseId}/quiz`, {
      method: "POST",
      body: JSON.stringify({ materialIds }),
    });
  },
};
