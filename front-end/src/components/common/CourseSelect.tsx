"use client";

import { BookOpen } from "lucide-react";
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
    <div className="max-w-md space-y-2">
      <Label htmlFor={id} className="flex items-center gap-2 text-sm font-medium">
        <BookOpen className="h-4 w-4 text-[var(--brand-steel)]" />
        {label}
      </Label>
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
