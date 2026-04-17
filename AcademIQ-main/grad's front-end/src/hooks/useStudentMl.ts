import { useQuery } from "@tanstack/react-query";
import { fetchStudentResultsMaybe } from "@/lib/api";

export function useStudentMl(studentId: string | undefined) {
  return useQuery({
    queryKey: ["api", "student_results", studentId],
    queryFn: () => fetchStudentResultsMaybe(studentId!),
    enabled: Boolean(studentId && studentId.trim()),
    staleTime: 15_000,
    retry: 1,
  });
}
