"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { api } from "@/lib/api";
import type { Course, PerformanceAnalysis } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { performanceStyle } from "@/lib/status";
import { AnimatedNumber } from "@/components/ui/animated-number";

interface CourseSnapshot {
  course: Course;
  grade: number | null;
  status: "Good" | "Average" | "At Risk";
  average: number;
}

const cardVariant = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.08,
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
    },
  }),
};

const noMotion = {
  hidden: { opacity: 1, y: 0 },
  visible: { opacity: 1, y: 0 },
};

export function CourseOverviewRow() {
  const [snapshots, setSnapshots] = useState<CourseSnapshot[] | null>(null);
  const prefersReducedMotion = useReducedMotion();
  const variants = prefersReducedMotion ? noMotion : cardVariant;

  useEffect(() => {
    let active = true;

    async function load() {
      const courses = await api.getCourses();
      const results = await Promise.all(
        courses.map((c) => api.getPerformance(c.id)),
      );
      if (!active) return;
      setSnapshots(
        results.map((r) => ({
          course: r.course,
          grade: r.predictedGrade,
          status: r.status,
          average: r.courseAverage,
        })),
      );
    }

    load().catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  if (!snapshots) return null;
  if (snapshots.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Your Courses</h2>
        <Link
          href="/performance"
          className="flex items-center gap-1 text-xs font-medium text-[var(--brand-steel)] transition-colors hover:text-[var(--brand-steel-light)]"
        >
          View all
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {snapshots.map((snap, i) => {
          const style = performanceStyle(snap.status);
          const gradeColor =
            snap.grade === null
              ? "var(--brand-steel)"
              : snap.grade >= 65
                ? "var(--brand-green)"
                : snap.grade >= 40
                  ? "var(--brand-orange)"
                  : "#ef4444";

          const delta =
            snap.grade !== null && snap.average > 0
              ? snap.grade - snap.average
              : null;
          const DeltaIcon =
            delta === null || Math.abs(delta) < 0.5
              ? Minus
              : delta > 0
                ? TrendingUp
                : TrendingDown;

          return (
            <motion.div
              key={snap.course.id}
              custom={i}
              variants={variants}
              initial="hidden"
              animate="visible"
            >
              <Link
                href={`/performance?course=${snap.course.id}`}
                className="group flex w-56 shrink-0 flex-col rounded-xl border border-border bg-card p-4 transition-all hover:border-[var(--brand-steel)]/40 hover:shadow-lg hover:-translate-y-0.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-muted-foreground">
                    {snap.course.code}
                  </span>
                  <Badge variant={style.variant} className="text-[10px]">
                    {snap.status}
                  </Badge>
                </div>
                <p className="mt-1 truncate text-sm font-medium text-foreground">
                  {snap.course.name}
                </p>

                <div className="mt-3 flex items-end justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Predicted
                    </p>
                    {snap.grade !== null ? (
                      <span className="text-2xl font-bold" style={{ color: gradeColor }}>
                        <AnimatedNumber value={snap.grade} />
                      </span>
                    ) : (
                      <span className="text-lg text-muted-foreground">—</span>
                    )}
                  </div>
                  {delta !== null && Math.abs(delta) >= 0.5 && (
                    <div
                      className="flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-medium"
                      style={{
                        color: delta > 0 ? "var(--brand-green)" : "var(--brand-orange)",
                        background:
                          delta > 0
                            ? "color-mix(in srgb, var(--brand-green) 10%, transparent)"
                            : "color-mix(in srgb, var(--brand-orange) 10%, transparent)",
                      }}
                    >
                      <DeltaIcon className="h-3 w-3" />
                      {Math.abs(delta).toFixed(0)}
                    </div>
                  )}
                </div>

                {/* Mini progress */}
                <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-muted">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: gradeColor }}
                    initial={prefersReducedMotion ? { width: `${snap.grade ?? 0}%` } : { width: 0 }}
                    animate={{ width: `${snap.grade ?? 0}%` }}
                    transition={
                      prefersReducedMotion
                        ? { duration: 0 }
                        : { duration: 0.8, delay: i * 0.08 + 0.2, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] }
                    }
                  />
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
