"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Brain, ClipboardList, ArrowRight } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { api } from "@/lib/api";
import type { CourseInsights, CounterfactualResponse } from "@/lib/types";
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

function InsightsContent() {
  const searchParams = useSearchParams();
  const courseParam = searchParams.get("course");
  const [insights, setInsights] = useState<CourseInsights | null>(null);
  const [counterfactual, setCounterfactual] = useState<CounterfactualResponse | null>(null);
  const [counterfactualError, setCounterfactualError] = useState<string | null>(null);
  const prefersReducedMotion = useReducedMotion();
  const variants = prefersReducedMotion ? staticVariant : fadeUp;

  useEffect(() => {
    let active = true;

    async function load() {
      let courseId = courseParam;
      if (!courseId) {
        const courses = await api.getCourses();
        courseId = courses[0]?.id ?? "";
      }
      if (!courseId) return;
      const data = await api.getInsights(courseId);
      if (active) setInsights(data);
    }

    load();
    return () => {
      active = false;
    };
  }, [courseParam]);

  useEffect(() => {
    let active = true;

    async function loadCounterfactual() {
      try {
        const data = await api.getCounterfactual();
        if (active) {
          setCounterfactual(data);
          setCounterfactualError(null);
        }
      } catch (err) {
        if (active) {
          setCounterfactual(null);
          setCounterfactualError(
            err instanceof Error
              ? err.message
              : "Counterfactual projection is currently unavailable.",
          );
        }
      }
    }

    loadCounterfactual();
    return () => {
      active = false;
    };
  }, []);

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
            "linear-gradient(135deg, var(--brand-navy-deep) 0%, var(--brand-navy) 50%, var(--brand-steel) 100%)",
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 70% 30%, white 0%, transparent 60%)",
          }}
        />
        <div className="relative">
          <Link
            href="/performance"
            className="mb-4 inline-flex items-center gap-1 text-sm text-white/50 transition-colors hover:text-white/80"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Performance
          </Link>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">
              <Brain className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Academic Insights</h1>
              <p className="text-white/60">
                {insights
                  ? `Overall behavioural assessment — viewed from ${insights.course.code}`
                  : "Loading insights…"}
              </p>
            </div>
          </div>
          {insights?.scope === "overall" && (
            <p className="mt-3 text-xs text-white/40 italic">
              Note: This classification reflects your overall academic behaviour across all courses,
              not this course in isolation.
            </p>
          )}
        </div>
      </motion.div>

      {insights ? (
        <>
          <motion.div custom={1} variants={variants} initial="hidden" animate="visible">
            <PerformanceClassification
              isHighPerformer={insights.isHighPerformer}
              summary={insights.classificationSummary}
            />
          </motion.div>

          <motion.div custom={2} variants={variants} initial="hidden" animate="visible">
            <RiskFactors factors={insights.riskFactors} />
          </motion.div>

          {counterfactual ? (
            <motion.div custom={3} variants={variants} initial="hidden" animate="visible">
              <CounterfactualCard data={counterfactual} />
            </motion.div>
          ) : counterfactualError ? (
            <motion.div custom={3} variants={variants} initial="hidden" animate="visible">
              <div className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
                {counterfactualError}
              </div>
            </motion.div>
          ) : null}

          <motion.div custom={4} variants={variants} initial="hidden" animate="visible">
            <Link
              href={`/evidence${courseParam ? `?course=${courseParam}` : ""}`}
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
                  See what the AI based this analysis on
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
            </Link>
          </motion.div>
        </>
      ) : (
        <div className="space-y-6">
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-56 w-full" />
        </div>
      )}
    </div>
  );
}

export default function InsightsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <InsightsContent />
    </Suspense>
  );
}
