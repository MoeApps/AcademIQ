"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { api } from "@/lib/api";
import type { Course, PerformanceAnalysis } from "@/lib/types";
import { CourseSelect } from "@/components/common/CourseSelect";
import { PredictedGradeCard } from "@/components/performance/PredictedGradeCard";
import { PerformanceStatusCard } from "@/components/performance/PerformanceStatusCard";
import { CourseAverageCard } from "@/components/performance/CourseAverageCard";
import { CourseStatistics } from "@/components/performance/CourseStatistics";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function PerformancePage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [analysis, setAnalysis] = useState<PerformanceAnalysis | null>(null);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [coursesError, setCoursesError] = useState("");

useEffect(() => {
  api.getCourses()
    .then((list) => {
      setCourses(list);
      if (list.length) setSelectedId(list[0].id);
    })
    .catch(() => setCoursesError("Could not load courses."))
    .finally(() => setCoursesLoading(false));
}, []);


  useEffect(() => {
    if (!selectedId) return;
    let active = true;
    api.getPerformance(selectedId).then((data) => {
      if (active) setAnalysis(data);
    });
    return () => {
      active = false;
    };
  }, [selectedId]);

  // Treat data as loading until it matches the currently selected course.
  const ready = analysis?.course.id === selectedId ? analysis : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Performance Analysis</h1>
        <p className="text-muted-foreground">
          Pick a course to see its predicted grade, status, and statistics.
        </p>
      </div>

{coursesLoading ? (
  <Skeleton className="h-16 w-full max-w-sm" />
) : coursesError ? (
  <div className="rounded-xl border p-6">
    <h2 className="font-semibold">Could not load courses</h2>
    <p className="text-sm text-muted-foreground">{coursesError}</p>
  </div>
) : courses.length ? (
  <CourseSelect
    courses={courses}
    value={selectedId}
    onChange={setSelectedId}
  />
) : (
  <div className="rounded-xl border p-6">
    <h2 className="font-semibold">No courses found</h2>
    <p className="text-sm text-muted-foreground">
      Open Moodle, run Scan/Sync from the extension, then refresh this page.
    </p>
  </div>
)}

      {ready ? (
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <PredictedGradeCard grade={ready.predictedGrade} />
            <PerformanceStatusCard status={ready.status} />
          </div>

          <Link
            href={`/insights?course=${ready.course.id}`}
            className={buttonVariants({ variant: "default" })}
          >
            View Insights
            <ArrowRight className="h-4 w-4" />
          </Link>

          <CourseAverageCard
            courseAverage={ready.courseAverage}
            predictedGrade={ready.predictedGrade}
          />
          <CourseStatistics stats={ready.statistics} />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-44 w-full" />
            <Skeleton className="h-44 w-full" />
          </div>
          <Skeleton className="h-44 w-full" />
        </div>
      )}
    </div>
  );
}
