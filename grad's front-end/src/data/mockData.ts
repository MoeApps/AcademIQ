// Mock data for courses and performance

export interface Course {
  id: string;
  name: string;
  code: string;
  instructor: string;
}

export interface PerformanceData {
  date: string;
  score: number;
}

export interface CourseStats {
  submittedAssignments: number;
  totalAssignments: number;
  avgAssignmentGrade: number;
  completedQuizzes: number;
  totalQuizzes: number;
  avgQuizGrade: number;
  timeSpentHours: number;
}

export const courses: Course[] = [
  { id: "cs101", name: "Introduction to Programming", code: "CS101", instructor: "Dr. Smith" },
  { id: "cs201", name: "Data Structures", code: "CS201", instructor: "Dr. Johnson" },
  { id: "cs301", name: "Database Systems", code: "CS301", instructor: "Prof. Williams" },
  { id: "cs401", name: "Software Engineering", code: "CS401", instructor: "Dr. Brown" },
  { id: "math201", name: "Linear Algebra", code: "MATH201", instructor: "Prof. Davis" },
  { id: "eng101", name: "Technical Writing", code: "ENG101", instructor: "Dr. Miller" },
];

export const weeklyPerformanceData: PerformanceData[] = [
  { date: "Mon", score: 72 },
  { date: "Tue", score: 78 },
  { date: "Wed", score: 85 },
  { date: "Thu", score: 82 },
  { date: "Fri", score: 88 },
  { date: "Sat", score: 90 },
  { date: "Sun", score: 85 },
];

export const coursePerformanceData: Record<string, PerformanceData[]> = {
  cs101: [
    { date: "Week 1", score: 85 },
    { date: "Week 2", score: 88 },
    { date: "Week 3", score: 82 },
    { date: "Week 4", score: 90 },
    { date: "Week 5", score: 92 },
    { date: "Week 6", score: 88 },
  ],
  cs201: [
    { date: "Week 1", score: 78 },
    { date: "Week 2", score: 72 },
    { date: "Week 3", score: 75 },
    { date: "Week 4", score: 80 },
    { date: "Week 5", score: 82 },
    { date: "Week 6", score: 85 },
  ],
  cs301: [
    { date: "Week 1", score: 65 },
    { date: "Week 2", score: 68 },
    { date: "Week 3", score: 62 },
    { date: "Week 4", score: 70 },
    { date: "Week 5", score: 72 },
    { date: "Week 6", score: 68 },
  ],
  cs401: [
    { date: "Week 1", score: 90 },
    { date: "Week 2", score: 92 },
    { date: "Week 3", score: 88 },
    { date: "Week 4", score: 95 },
    { date: "Week 5", score: 93 },
    { date: "Week 6", score: 91 },
  ],
  math201: [
    { date: "Week 1", score: 75 },
    { date: "Week 2", score: 78 },
    { date: "Week 3", score: 80 },
    { date: "Week 4", score: 82 },
    { date: "Week 5", score: 85 },
    { date: "Week 6", score: 88 },
  ],
  eng101: [
    { date: "Week 1", score: 88 },
    { date: "Week 2", score: 85 },
    { date: "Week 3", score: 90 },
    { date: "Week 4", score: 88 },
    { date: "Week 5", score: 92 },
    { date: "Week 6", score: 90 },
  ],
};

export const courseStats: Record<string, CourseStats> = {
  cs101: {
    submittedAssignments: 8,
    totalAssignments: 10,
    avgAssignmentGrade: 87,
    completedQuizzes: 5,
    totalQuizzes: 6,
    avgQuizGrade: 85,
    timeSpentHours: 42,
  },
  cs201: {
    submittedAssignments: 6,
    totalAssignments: 8,
    avgAssignmentGrade: 78,
    completedQuizzes: 4,
    totalQuizzes: 5,
    avgQuizGrade: 76,
    timeSpentHours: 38,
  },
  cs301: {
    submittedAssignments: 5,
    totalAssignments: 8,
    avgAssignmentGrade: 68,
    completedQuizzes: 3,
    totalQuizzes: 5,
    avgQuizGrade: 65,
    timeSpentHours: 28,
  },
  cs401: {
    submittedAssignments: 9,
    totalAssignments: 10,
    avgAssignmentGrade: 92,
    completedQuizzes: 6,
    totalQuizzes: 6,
    avgQuizGrade: 94,
    timeSpentHours: 55,
  },
  math201: {
    submittedAssignments: 7,
    totalAssignments: 8,
    avgAssignmentGrade: 82,
    completedQuizzes: 4,
    totalQuizzes: 5,
    avgQuizGrade: 80,
    timeSpentHours: 35,
  },
  eng101: {
    submittedAssignments: 8,
    totalAssignments: 8,
    avgAssignmentGrade: 89,
    completedQuizzes: 5,
    totalQuizzes: 5,
    avgQuizGrade: 88,
    timeSpentHours: 30,
  },
};

export const getOverallStatus = (avgScore: number): "At Risk" | "Good" | "Perfect" => {
  if (avgScore < 70) return "At Risk";
  if (avgScore < 85) return "Good";
  return "Perfect";
};

export const getCourseStatus = (avgScore: number): "Bad" | "Average" | "Good" => {
  if (avgScore < 70) return "Bad";
  if (avgScore < 85) return "Average";
  return "Good";
};
