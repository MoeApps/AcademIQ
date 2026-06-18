"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BarChart3, Brain, ClipboardList, ArrowRight, Sparkles } from "lucide-react";
import { motion, useReducedMotion, useInView } from "framer-motion";

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

function Section({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const prefersReducedMotion = useReducedMotion();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <motion.div
      ref={ref}
      initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={
        prefersReducedMotion
          ? { duration: 0 }
          : { duration: 0.6, delay, ease: [0.25, 1, 0.5, 1] as [number, number, number, number] }
      }
      className={className}
    >
      {children}
    </motion.div>
  );
}

function ShimmerBlock({ className }: { className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-border/40 bg-muted/30 ${className ?? ""}`}
    >
      <div
        className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite]"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, color-mix(in srgb, var(--brand-steel) 6%, transparent) 50%, transparent 100%)",
        }}
      />
    </div>
  );
}

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

    setAnalysis(null);
    setInsights(null);

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
      {/* ── Hero Strip ── */}
      <motion.div
        initial={prefersReducedMotion ? {} : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={
          prefersReducedMotion
            ? { duration: 0 }
            : { duration: 0.7, ease: [0.25, 1, 0.5, 1] as [number, number, number, number] }
        }
        className="group relative overflow-hidden rounded-2xl px-6 py-8 sm:px-8 sm:py-10"
        style={{
          background:
            "linear-gradient(135deg, var(--brand-navy) 0%, var(--brand-navy-deep) 40%, var(--brand-medblue) 100%)",
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
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        <div
          className="pointer-events-none absolute -right-20 -bottom-20 h-60 w-60 rounded-full opacity-0 blur-3xl transition-opacity duration-700 group-hover:opacity-20"
          style={{ background: "var(--brand-steel)" }}
        />

        <div className="relative flex items-center gap-4">
          <motion.div
            initial={prefersReducedMotion ? {} : { scale: 0, rotate: -15 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : { type: "spring" as const, stiffness: 260, damping: 20, delay: 0.2 }
            }
            className="flex h-13 w-13 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm shadow-lg shadow-black/10"
          >
            <BarChart3 className="h-6 w-6 text-white" />
          </motion.div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Performance & Insights
            </h1>
            <p className="mt-1 text-sm text-white/50 sm:text-base">
              Predicted grades, AI classification, risk factors, and recommendations.
            </p>
          </div>
        </div>
      </motion.div>

      {/* ── Course Selector ── */}
      <Section delay={0.05}>
        {coursesLoading ? (
          <ShimmerBlock className="h-16 w-full max-w-sm" />
        ) : coursesError ? (
          <div className="rounded-2xl border border-border/60 bg-card p-6">
            <h2 className="font-semibold text-foreground">Could not load courses</h2>
            <p className="text-sm text-muted-foreground">{coursesError}</p>
          </div>
        ) : courses.length ? (
          <CourseSelect courses={courses} value={selectedId} onChange={setSelectedId} />
        ) : (
          <div className="rounded-2xl border border-border/60 bg-card p-6">
            <h2 className="font-semibold text-foreground">No courses found</h2>
            <p className="text-sm text-muted-foreground">
              Open Moodle, run Scan/Sync from the extension, then refresh this page.
            </p>
          </div>
        )}
      </Section>

      {ready ? (
        <>
          {/* ── Performance Section ── */}
          <div className="grid gap-6 md:grid-cols-2">
            <Section delay={0}>
              <PredictedGradeCard grade={ready.predictedGrade} />
            </Section>
            <Section delay={0.08}>
              <PerformanceStatusCard
                status={ready.status}
                scopeLabel={ready.statusScope === "overall" ? "Overall academic" : "This course"}
              />
            </Section>
          </div>

          <Section>
            <CourseAverageCard
              courseAverage={ready.courseAverage}
              predictedGrade={ready.predictedGrade}
            />
          </Section>

          <Section>
            <CourseStatistics stats={ready.statistics} />
          </Section>

          {/* ── AI Insights Divider ── */}
          <Section>
            <div className="relative flex items-center gap-4 py-2">
              <div
                className="h-px flex-1"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, color-mix(in srgb, var(--brand-steel) 30%, transparent), color-mix(in srgb, var(--brand-steel) 10%, transparent))",
                }}
              />
              <div
                className="flex items-center gap-2.5 rounded-full border px-5 py-2.5 shadow-sm backdrop-blur-sm"
                style={{
                  borderColor: "color-mix(in srgb, var(--brand-steel) 20%, transparent)",
                  background: "color-mix(in srgb, var(--brand-steel) 4%, var(--color-card))",
                }}
              >
                <Brain className="h-4 w-4 text-[var(--brand-steel)]" />
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--brand-steel)]">
                  AI Insights
                </span>
                <Sparkles className="h-3 w-3 text-[var(--brand-steel)] opacity-60" />
              </div>
              <div
                className="h-px flex-1"
                style={{
                  background:
                    "linear-gradient(90deg, color-mix(in srgb, var(--brand-steel) 10%, transparent), color-mix(in srgb, var(--brand-steel) 30%, transparent), transparent)",
                }}
              />
            </div>
          </Section>

          {insightsReady?.scope === "overall" && (
            <Section>
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
            </Section>
          )}

          {/* ── Classification ── */}
          <Section>
            {insightsReady ? (
              <PerformanceClassification
                isHighPerformer={insightsReady.isHighPerformer}
                summary={insightsReady.classificationSummary}
              />
            ) : (
              <ShimmerBlock className="h-40" />
            )}
          </Section>

          {/* ── Risk Factors ── */}
          <Section>
            {insightsReady ? (
              <RiskFactors factors={insightsReady.riskFactors} />
            ) : (
              <div className="space-y-4">
                <ShimmerBlock className="h-10 w-40" />
                <ShimmerBlock className="h-32" />
                <ShimmerBlock className="h-32" />
              </div>
            )}
          </Section>

          {/* ── Counterfactual ── */}
          <Section>
            {counterfactual ? (
              <CounterfactualCard data={counterfactual} />
            ) : counterfactualError ? (
              <div className="rounded-2xl border border-border/60 bg-card p-5 text-sm text-muted-foreground">
                {counterfactualError}
              </div>
            ) : (
              <ShimmerBlock className="h-48" />
            )}
          </Section>

          {/* ── Evidence Timeline CTA ── */}
          <Section>
            <Link
              href={`/evidence?course=${ready.course.id}`}
              className="group/cta relative flex items-center gap-4 overflow-hidden rounded-2xl border border-border/60 bg-card p-6 transition-all duration-300 hover:border-[var(--brand-steel)]/30 hover:shadow-lg hover:-translate-y-0.5"
            >
              <div
                className="pointer-events-none absolute -right-16 -bottom-16 h-48 w-48 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover/cta:opacity-[0.08]"
                style={{ background: "var(--brand-steel)" }}
              />
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover/cta:scale-110"
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
              <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform duration-200 group-hover/cta:translate-x-1" />
            </Link>
          </Section>
        </>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <ShimmerBlock className="h-56" />
            <ShimmerBlock className="h-56" />
          </div>
          <ShimmerBlock className="h-44" />
          <ShimmerBlock className="h-56" />
          <ShimmerBlock className="h-40" />
          <ShimmerBlock className="h-64" />
        </div>
      )}
    </div>
  );
}

export default function PerformancePage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <ShimmerBlock className="h-32" />
          <ShimmerBlock className="h-16 w-64" />
          <div className="grid gap-6 md:grid-cols-2">
            <ShimmerBlock className="h-56" />
            <ShimmerBlock className="h-56" />
          </div>
        </div>
      }
    >
      <PerformanceContent />
    </Suspense>
  );
}
