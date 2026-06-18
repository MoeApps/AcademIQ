"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, BarChart3 } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

import { api } from "@/lib/api";
import type { Course, PerformanceAnalysis } from "@/lib/types";
import { CourseSelect } from "@/components/common/CourseSelect";
import { PredictedGradeCard } from "@/components/performance/PredictedGradeCard";
import { PerformanceStatusCard } from "@/components/performance/PerformanceStatusCard";
import { CourseAverageCard } from "@/components/performance/CourseAverageCard";
import { CourseStatistics } from "@/components/performance/CourseStatistics";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.5,
      ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
    },
  }),
};

const staticVariant = {
  hidden: { opacity: 1, y: 0 },
  visible: { opacity: 1, y: 0 },
};

export default function PerformancePage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [analysis, setAnalysis] = useState<PerformanceAnalysis | null>(null);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [coursesError, setCoursesError] = useState("");
  const prefersReducedMotion = useReducedMotion();
  const variants = prefersReducedMotion ? staticVariant : fadeUp;

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

  const ready = analysis?.course.id === selectedId ? analysis : null;

  return (
    <div className="space-y-8">
      {/* Hero strip */}
      <motion.div
        custom={0}
        variants={variants}
        initial="hidden"
        animate="visible"
        className="relative overflow-hidden rounded-xl px-6 py-8"
        style={{
          background:
            "linear-gradient(135deg, var(--brand-navy) 0%, var(--brand-medblue) 100%)",
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 80% 20%, white 0%, transparent 60%)",
          }}
        />
        <div className="relative flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">
            <BarChart3 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Performance Analysis</h1>
            <p className="text-white/60">
              Pick a course to see its predicted grade, status, and statistics.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Course selector */}
      <motion.div custom={1} variants={variants} initial="hidden" animate="visible">
        {coursesLoading ? (
          <Skeleton className="h-16 w-full max-w-sm" />
        ) : coursesError ? (
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="font-semibold text-foreground">Could not load courses</h2>
            <p className="text-sm text-muted-foreground">{coursesError}</p>
          </div>
        ) : courses.length ? (
          <CourseSelect courses={courses} value={selectedId} onChange={setSelectedId} />
        ) : (
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="font-semibold text-foreground">No courses found</h2>
            <p className="text-sm text-muted-foreground">
              Open Moodle, run Scan/Sync from the extension, then refresh this page.
            </p>
          </div>
        )}
      </motion.div>

      {ready ? (
        <>
          {/* Grade + Status cards */}
          <motion.div
            custom={2}
            variants={variants}
            initial="hidden"
            animate="visible"
            className="grid gap-6 md:grid-cols-2"
          >
            <PredictedGradeCard grade={ready.predictedGrade} />
            <PerformanceStatusCard
              status={ready.status}
              scopeLabel={ready.statusScope === "overall" ? "Overall academic" : "This course"}
            />
          </motion.div>

          {/* Course Average */}
          <motion.div custom={3} variants={variants} initial="hidden" animate="visible">
            <CourseAverageCard
              courseAverage={ready.courseAverage}
              predictedGrade={ready.predictedGrade}
            />
          </motion.div>

          {/* Course Statistics */}
          <motion.div custom={4} variants={variants} initial="hidden" animate="visible">
            <CourseStatistics stats={ready.statistics} />
          </motion.div>

          {/* CTA to insights */}
          <motion.div custom={5} variants={variants} initial="hidden" animate="visible">
            <Link
              href={`/insights?course=${ready.course.id}`}
              className={cn(
                buttonVariants({ variant: "default", size: "lg" }),
                "group gap-2",
              )}
            >
              View AI Insights
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </motion.div>
        </>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-52 w-full" />
            <Skeleton className="h-52 w-full" />
          </div>
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-56 w-full" />
        </div>
      )}
    </div>
  );
}
