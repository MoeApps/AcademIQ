/**
 * AcademIQ FastAPI client. Base URL from VITE_API_URL (default http://127.0.0.1:8000).
 */
const DEFAULT_BASE = "http://127.0.0.1:8000";

export function getApiBase(): string {
  const raw = import.meta.env.VITE_API_URL as string | undefined;
  const base = (raw && raw.trim()) || DEFAULT_BASE;
  return base.replace(/\/$/, "");
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function parseJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${getApiBase()}${path.startsWith("/") ? path : `/${path}`}`, {
    credentials: "omit",
  });
  const data = await parseJson(res);
  if (!res.ok) {
    throw new ApiError(`GET ${path} failed`, res.status, data);
  }
  return data as T;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${getApiBase()}${path.startsWith("/") ? path : `/${path}`}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "omit",
    body: JSON.stringify(body),
  });
  const data = await parseJson(res);
  if (!res.ok) {
    throw new ApiError(`POST ${path} failed`, res.status, data);
  }
  return data as T;
}

/** GET / — health */
export async function fetchHealth(): Promise<{ message: string }> {
  return apiGet<{ message: string }>("/");
}

/** Mongo course list */
export interface ApiCourse {
  id: string;
  course_id: string;
  name: string;
  visits: number;
  time_spent_ms: number;
  final_grade: string | null;
}

/** GET /student_results?student_id= */
export interface StudentResultsResponse {
  status: string;
  student_id: string;
  result: {
    features: Record<string, number>;
    risk_cluster: number;
    risk_cluster_encoded: number;
    recommendation: string;
  };
}

export async function fetchStudentResults(studentId: string): Promise<StudentResultsResponse> {
  const q = encodeURIComponent(studentId);
  return apiGet<StudentResultsResponse>(`/student_results?student_id=${q}`);
}

/** Same as fetchStudentResults but returns null on 404 (no sync yet). */
export async function fetchStudentResultsMaybe(studentId: string): Promise<StudentResultsResponse | null> {
  try {
    return await fetchStudentResults(studentId);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

export interface QuizQuestion {
  id: number;
  type: string;
  prompt: string;
  choices: string[];
  answer: string;
}

export interface GenerateQuizResponse {
  status: string;
  course_id: string;
  questions: QuizQuestion[];
  message: string;
  source?: "openai" | "stub";
  saved?: boolean;
  mongo_id?: string | null;
  fallback_reason?: string;
}

export interface GenerateNotesResponse {
  status: string;
  course_id: string;
  notes: string;
  message: string;
  source?: "openai" | "stub";
  saved?: boolean;
  mongo_id?: string | null;
  fallback_reason?: string;
}

/** Saved quiz document from GET /ai/course/{id}/quizzes */
export interface AiQuizDoc {
  id: string;
  course_id: string;
  course_name?: string;
  topics: string[];
  questions: QuizQuestion[];
  source: string;
  created_at?: string;
}

export async function generateQuizApi(
  courseId: string,
  courseName: string,
  chapters: string[]
): Promise<GenerateQuizResponse> {
  return apiPost<GenerateQuizResponse>("/ai/generate-quiz", {
    course_id: courseId,
    course_name: courseName,
    chapters,
  });
}

export async function generateNotesApi(
  courseId: string,
  courseName: string,
  chapters: string[]
): Promise<GenerateNotesResponse> {
  return apiPost<GenerateNotesResponse>("/ai/generate-notes", {
    course_id: courseId,
    course_name: courseName,
    chapters,
  });
}

/** GET /ai/course/{courseId}/quizzes — saved quizzes (Mongo), optional topic filter */
export async function fetchCourseAiQuizzes(courseId: string, topic?: string): Promise<AiQuizDoc[]> {
  const q = topic ? `?topic=${encodeURIComponent(topic)}` : "";
  const r = await apiGet<{ status: string; quizzes: AiQuizDoc[] }>(
    `/ai/course/${encodeURIComponent(courseId)}/quizzes${q}`
  );
  return r.quizzes ?? [];
}
