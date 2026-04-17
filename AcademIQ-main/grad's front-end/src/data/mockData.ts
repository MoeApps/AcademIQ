// Mock data for courses and performance

export interface Course {
  id: string;
  name: string;
  code: string;
  instructor: string;
  chapters: string[];
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
  { id: "cs101", name: "Introduction to Programming", code: "CS101", instructor: "Dr. Traggy", chapters: ["Variables & Data Types", "Control Flow", "Functions", "Arrays & Lists", "OOP Basics"] },
  { id: "cs201", name: "Data Structures", code: "CS201", instructor: "Dr. Ashraf", chapters: ["Arrays & Linked Lists", "Stacks & Queues", "Trees", "Graphs", "Hashing"] },
  { id: "cs301", name: "Database", code: "CS301", instructor: "Dr. Fatma", chapters: ["ER Modeling", "Relational Model", "SQL Basics", "Normalization", "Transactions"] },
  { id: "cs401", name: "Software Engineering", code: "CS401", instructor: "Dr. Yasmin", chapters: ["SDLC Models", "Requirements Engineering", "Design Patterns", "Testing", "Agile Methods"] },
  { id: "math201", name: "Linear Algebra", code: "MATH201", instructor: "Dr. Emad", chapters: ["Vectors", "Matrices", "Determinants", "Eigenvalues", "Linear Transformations"] },
  { id: "eng101", name: "English", code: "ENG101", instructor: "Dr. Rahma", chapters: ["Grammar Review", "Academic Writing", "Report Writing", "Presentation Skills", "Research Methods"] },
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

// Schedule data
export interface ScheduleEntry {
  day: string;
  time: string;
  courseCode: string;
  courseName: string;
  room: string;
}

export const scheduleData: ScheduleEntry[] = [
  { day: "Sunday", time: "08:00 - 09:30", courseCode: "CS101", courseName: "Introduction to Programming", room: "Hall A1" },
  { day: "Sunday", time: "10:00 - 11:30", courseCode: "MATH201", courseName: "Linear Algebra", room: "Hall B2" },
  { day: "Monday", time: "08:00 - 09:30", courseCode: "CS201", courseName: "Data Structures", room: "Lab 3" },
  { day: "Monday", time: "12:00 - 13:30", courseCode: "ENG101", courseName: "English", room: "Hall C1" },
  { day: "Tuesday", time: "09:00 - 10:30", courseCode: "CS301", courseName: "Database", room: "Lab 1" },
  { day: "Tuesday", time: "11:00 - 12:30", courseCode: "CS401", courseName: "Software Engineering", room: "Hall A2" },
  { day: "Wednesday", time: "08:00 - 09:30", courseCode: "CS101", courseName: "Introduction to Programming", room: "Lab 2" },
  { day: "Wednesday", time: "10:00 - 11:30", courseCode: "MATH201", courseName: "Linear Algebra", room: "Hall B2" },
  { day: "Thursday", time: "09:00 - 10:30", courseCode: "CS201", courseName: "Data Structures", room: "Hall A1" },
  { day: "Thursday", time: "11:00 - 12:30", courseCode: "CS401", courseName: "Software Engineering", room: "Lab 3" },
];

// Quiz grades data
export interface QuizGrade {
  quizName: string;
  score: number;
  totalMarks: number;
  date: string;
}

export const quizGrades: Record<string, QuizGrade[]> = {
  cs101: [
    { quizName: "Quiz 1", score: 18, totalMarks: 20, date: "2026-01-10" },
    { quizName: "Quiz 2", score: 16, totalMarks: 20, date: "2026-01-24" },
    { quizName: "Quiz 3", score: 19, totalMarks: 20, date: "2026-02-07" },
  ],
  cs201: [
    { quizName: "Quiz 1", score: 14, totalMarks: 20, date: "2026-01-12" },
    { quizName: "Quiz 2", score: 15, totalMarks: 20, date: "2026-01-26" },
    { quizName: "Quiz 3", score: 17, totalMarks: 20, date: "2026-02-09" },
  ],
  cs301: [
    { quizName: "Quiz 1", score: 12, totalMarks: 20, date: "2026-01-11" },
    { quizName: "Quiz 2", score: 13, totalMarks: 20, date: "2026-01-25" },
    { quizName: "Quiz 3", score: 14, totalMarks: 20, date: "2026-02-08" },
  ],
  cs401: [
    { quizName: "Quiz 1", score: 19, totalMarks: 20, date: "2026-01-13" },
    { quizName: "Quiz 2", score: 18, totalMarks: 20, date: "2026-01-27" },
    { quizName: "Quiz 3", score: 20, totalMarks: 20, date: "2026-02-10" },
  ],
  math201: [
    { quizName: "Quiz 1", score: 15, totalMarks: 20, date: "2026-01-14" },
    { quizName: "Quiz 2", score: 16, totalMarks: 20, date: "2026-01-28" },
    { quizName: "Quiz 3", score: 17, totalMarks: 20, date: "2026-02-11" },
  ],
  eng101: [
    { quizName: "Quiz 1", score: 17, totalMarks: 20, date: "2026-01-15" },
    { quizName: "Quiz 2", score: 18, totalMarks: 20, date: "2026-01-29" },
    { quizName: "Quiz 3", score: 19, totalMarks: 20, date: "2026-02-12" },
  ],
};
