"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BarChart3, Brain, ClipboardList, ArrowRight } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

import { api } from "@/lib/api";
import type { Course, PerformanceAnalysis, CourseInsights, CounterfactualResponse } from "@/lib/types";
import { CourseSelect } from "@/components/common/CourseSelect";
import { PredictedGradeCard } from "@/components/performance/PredictedGradeCard";
import { PerformanceStatusCard } from "@/components/performance/PerformanceStatusCard";
import { CourseAverageCard } from "@/components/performance/CourseAverageCard";
import { CourseStatistics } from "@/components/performance/CourseStatistics";
import { PerformanceClassification } from "@/components/insights/PerformanceClassification";
import { RiskFactors } from "@/components/insights/RiskFactors";
import { CounterfactualCard } from "@/components/insights/CounterfactualCard";
import { Skeleton } from "@/components/ui/skeleton";

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

function PerformanceContent() {
  const searchParams = useSearchParams();
  const courseParam = searchParams.get("course");
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [analysis, setAnalysis] = useState<PerformanceAnalysis | null>(null);
  const [insights, setInsights] = useState<CourseInsights | null>(null);
  const [counterfactual, setCounterfactual] = useState<CounterfactualResponse | null>(null);
  const [counterfactualError, setCounterfactualError] = useState<string | null>(null);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [coursesError, setCoursesError] = useState("");
  const prefersReducedMotion = useReducedMotion();
  const variants = prefersReducedMotion ? staticVariant : fadeUp;

  useEffect(() => {
    api.getCourses()
      .then((list) => {
        setCourses(list);
        const initial = courseParam && list.some((c) => c.id === courseParam)
          ? courseParam
          : list[0]?.id ?? "";
        if (initial) setSelectedId(initial);
      })
      .catch(() => setCoursesError("Could not load courses."))
      .finally(() => setCoursesLoading(false));
  }, [courseParam]);

  useEffect(() => {
    if (!selectedId) return;
    let active = true;

    api.getPerformance(selectedId).then((data) => {
      if (active) setAnalysis(data);
    });

    api.getInsights(selectedId).then((data) => {
      if (active) setInsights(data);
    });

    return () => {
      active = false;
    };
  }, [selectedId]);

  useEffect(() => {
    let active = true;

    api.getCounterfactual()
      .then((data) => {
        if (active) {
          setCounterfactual(data);
          setCounterfactualError(null);
        }
      })
      .catch((err) => {
        if (active) {
          setCounterfactual(null);
          setCounterfactualError(
            err instanceof Error
              ? err.message
              : "Counterfactual projection is currently unavailable.",
          );
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const ready = analysis?.course.id === selectedId ? analysis : null;
  const insightsReady = insights?.course.id === selectedId ? insights : null;

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
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        <div className="relative flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">
            <BarChart3 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Performance & Insights</h1>
            <p className="text-white/60">
              Predicted grades, AI classification, risk factors, and recommendations — all in one place.
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
          {/* ── Performance Section ── */}
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

          <motion.div custom={3} variants={variants} initial="hidden" animate="visible">
            <CourseAverageCard
              courseAverage={ready.courseAverage}
              predictedGrade={ready.predictedGrade}
            />
          </motion.div>

          <motion.div custom={4} variants={variants} initial="hidden" animate="visible">
            <CourseStatistics stats={ready.statistics} />
          </motion.div>

          {/* ── Section Divider ── */}
          <motion.div
            custom={5}
            variants={variants}
            initial="hidden"
            animate="visible"
            className="relative flex items-center gap-4 py-2"
          >
            <div className="h-px flex-1 bg-border" />
            <div className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2">
              <Brain className="h-4 w-4 text-[var(--brand-steel)]" />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                AI Insights
              </span>
            </div>
            <div className="h-px flex-1 bg-border" />
          </motion.div>

          {insightsReady?.scope === "overall" && (
            <motion.div custom={5} variants={variants} initial="hidden" animate="visible">
              <div
                className="rounded-xl border px-4 py-3 text-xs text-muted-foreground italic"
                style={{
                  borderColor: "color-mix(in srgb, var(--brand-steel) 20%, transparent)",
                  background: "color-mix(in srgb, var(--brand-steel) 4%, transparent)",
                }}
              >
                This classification reflects your overall academic behaviour across all courses,
                not this course in isolation. Course-specific stats are shown above.
              </div>
            </motion.div>
          )}

          {/* Classification */}
          <motion.div custom={6} variants={variants} initial="hidden" animate="visible">
            {insightsReady ? (
              <PerformanceClassification
                isHighPerformer={insightsReady.isHighPerformer}
                summary={insightsReady.classificationSummary}
              />
            ) : (
              <Skeleton className="h-40 w-full" />
            )}
          </motion.div>

          {/* Risk Factors */}
          <motion.div custom={7} variants={variants} initial="hidden" animate="visible">
            {insightsReady ? (
              <RiskFactors factors={insightsReady.riskFactors} />
            ) : (
              <Skeleton className="h-64 w-full" />
            )}
          </motion.div>

          {/* Counterfactual */}
          <motion.div custom={8} variants={variants} initial="hidden" animate="visible">
            {counterfactual ? (
              <CounterfactualCard data={counterfactual} />
            ) : counterfactualError ? (
              <div className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
                {counterfactualError}
              </div>
            ) : (
              <Skeleton className="h-48 w-full" />
            )}
          </motion.div>

          {/* Evidence Timeline link */}
          <motion.div custom={9} variants={variants} initial="hidden" animate="visible">
            <Link
              href={`/evidence?course=${ready.course.id}`}
              className="group flex items-center gap-4 rounded-xl border border-border bg-card p-5 transition-all hover:border-[var(--brand-steel)]/40 hover:shadow-lg hover:-translate-y-0.5"
            >
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                style={{ background: "color-mix(in srgb, var(--brand-steel) 12%, transparent)" }}
              >
                <ClipboardList className="h-5 w-5 text-[var(--brand-steel)]" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground">View Evidence Timeline</p>
                <p className="text-sm text-muted-foreground">
                  See the raw events the AI based this analysis on
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
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
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      )}
    </div>
  );
}

export default function PerformancePage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <PerformanceContent />
    </Suspense>
  );
}
