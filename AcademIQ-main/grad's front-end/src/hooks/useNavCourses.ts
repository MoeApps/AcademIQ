import { useQuery } from "@tanstack/react-query";
import { apiGet, ApiCourse } from "@/lib/api";
import { mergeCoursesUi } from "@/lib/courseMerge";

export function useNavCourses() {
  return useQuery({
    queryKey: ["api", "courses"],
    queryFn: async () => apiGet<ApiCourse[]>("/courses"),
    select: (data) => mergeCoursesUi(data),
    staleTime: 30_000,
    retry: 1,
  });
}
