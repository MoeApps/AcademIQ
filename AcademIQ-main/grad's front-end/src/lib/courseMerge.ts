import type { Course } from "@/data/mockData";
import { courses as mockCourses } from "@/data/mockData";
import type { ApiCourse } from "@/lib/api";

/**
 * Map Mongo `/courses` rows into UI `Course` cards. Falls back to mock when empty.
 */
export function apiCoursesToUiCourses(rows: ApiCourse[]): Course[] {
  if (!rows.length) return mockCourses;

  return rows.map((c, idx) => {
    const cid = String(c.course_id || c.id || idx);
    return {
      id: cid,
      name: c.name || `Course ${cid}`,
      code: cid.length <= 8 ? cid.toUpperCase() : `C${cid.slice(0, 5)}`,
      instructor: "LMS",
      chapters: mockCourses[Math.min(idx, mockCourses.length - 1)].chapters,
    };
  });
}

export function mergeCoursesUi(apiRows: ApiCourse[] | undefined): Course[] {
  return apiCoursesToUiCourses(apiRows ?? []);
}
