import {
  createMockUser,
  deleteMockUser,
  getMockAuthUser,
  getMockInsights,
  getMockMaterials,
  getMockPerformance,
  getMockQuiz,
  getMockUsers,
  mockCourses,
  mockDashboard,
  resetMockPassword,
  updateMockUser,
} from "./mock";
import type {
  AuthResult,
  AuthUser,
  Course,
  CourseInsights,
  DashboardData,
  GeneratedQuiz,
  LearningMaterial,
  PerformanceAnalysis,
  UserInput,
  UserMutationResult,
} from "./types";

/**
 * Single seam between the UI and the data layer.
 *
 * Today every call resolves against the mock data in `mock.ts`. To switch to
 * the live FastAPI backend, set NEXT_PUBLIC_API_BASE_URL (and leave
 * NEXT_PUBLIC_USE_MOCK unset / "false"); each method then performs the real
 * fetch shown in its `// LIVE:` comment. The UI never changes.
 *
 * Auth uses cookie-based sessions: every request sends credentials, and the
 * backend sets/clears an httpOnly session cookie on login/logout.
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
  // Some endpoints (logout/delete) may return an empty body.
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export const api = {
  /* ---------------------------------------------------------------------- */
  /* Auth                                                                   */
  /* ---------------------------------------------------------------------- */

  /** Authenticate with email + password. Returns profile, role, and token. */
  async signIn(email: string, password: string): Promise<AuthResult> {
    if (USE_MOCK) {
      const user = getMockAuthUser(email);
      return delay({ user, role: user.role, token: "mock-session-token" });
    }
    return request<AuthResult>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },

  /** Invalidate the current session. */
  async signOut(): Promise<void> {
    if (USE_MOCK) return delay(undefined, 150);
    await request<void>("/api/auth/logout", { method: "POST" });
  },

  /** Resolve the current session, or null if unauthenticated. */
  async getMe(): Promise<AuthUser | null> {
    if (USE_MOCK) return delay(null, 150);
    try {
      const data = await request<{ user: AuthUser }>("/api/auth/me");
      return data.user;
    } catch {
      return null;
    }
  },

  /* ---------------------------------------------------------------------- */
  /* Admin — user management (admin role required by the backend)           */
  /* ---------------------------------------------------------------------- */

  async getUsers(search?: string): Promise<AuthUser[]> {
    if (USE_MOCK) return delay(getMockUsers(search));
    const q = search ? `?search=${encodeURIComponent(search)}` : "";
    return request<AuthUser[]>(`/api/admin/users${q}`);
  },

  async createUser(input: UserInput): Promise<UserMutationResult> {
    if (USE_MOCK) return delay(createMockUser(input));
    return request<UserMutationResult>("/api/admin/users", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  async updateUser(
    id: string,
    input: Partial<UserInput>,
  ): Promise<UserMutationResult> {
    if (USE_MOCK) return delay({ user: updateMockUser(id, input) });
    return request<UserMutationResult>(`/api/admin/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(input),
    });
  },

  async deleteUser(id: string): Promise<void> {
    if (USE_MOCK) {
      deleteMockUser(id);
      return delay(undefined, 200);
    }
    await request<void>(`/api/admin/users/${id}`, { method: "DELETE" });
  },

  async resetPassword(
    id: string,
    password?: string,
  ): Promise<{ generatedPassword?: string }> {
    if (USE_MOCK) {
      return delay({
        generatedPassword: password ? undefined : resetMockPassword(),
      });
    }
    return request<{ generatedPassword?: string }>(
      `/api/admin/users/${id}/reset-password`,
      { method: "POST", body: JSON.stringify({ password }) },
    );
  },

  /* ---------------------------------------------------------------------- */
  /* Student-facing data                                                    */
  /* ---------------------------------------------------------------------- */

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
