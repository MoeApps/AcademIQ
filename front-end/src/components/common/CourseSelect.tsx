import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { Course } from "@/lib/types";

interface CourseSelectProps {
  courses: Course[];
  value: string;
  onChange: (courseId: string) => void;
  label?: string;
  id?: string;
}

export function CourseSelect({
  courses,
  value,
  onChange,
  label = "Select a course",
  id = "course-select",
}: CourseSelectProps) {
  return (
    <div className="max-w-sm space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {courses.map((course) => (
          <option key={course.id} value={course.id}>
            {course.code} — {course.name}
          </option>
        ))}
      </Select>
    </div>
  );
}
