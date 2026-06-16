"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ClipboardList } from "lucide-react";
import { api } from "@/lib/api";
import type { CourseInsights } from "@/lib/types";
import { PerformanceClassification } from "@/components/insights/PerformanceClassification";
import { RiskFactors } from "@/components/insights/RiskFactors";
import { Skeleton } from "@/components/ui/skeleton";

function InsightsContent() {
  const searchParams = useSearchParams();
  const courseParam = searchParams.get("course");
  const [insights, setInsights] = useState<CourseInsights | null>(null);

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

  return (
    <div className="space-y-6">
      <Link
        href="/performance"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Performance Analysis
      </Link>

<div>
        <h1 className="text-2xl font-bold text-foreground">Academic Insights</h1>
        <p className="text-muted-foreground">
          {insights
            ? `Overall behavioural assessment — viewed from ${insights.course.code}`
            : "Loading insights…"}
        </p>
        {insights?.scope === "overall" && (
          <p className="mt-2 text-xs text-muted-foreground/80 italic">
            Note: This classification reflects your overall academic behaviour across all courses,
            not this course in isolation. Course-specific stats are on the Performance page.
          </p>
        )}
      </div>

      {insights ? (
        <>
          <PerformanceClassification
            isHighPerformer={insights.isHighPerformer}
            summary={insights.classificationSummary}
          />
          <RiskFactors factors={insights.riskFactors} />

          {/* Link to the Evidence Timeline for deeper behavioural explanation */}
          <Link
            href={`/evidence${courseParam ? `?course=${courseParam}` : ""}`}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
            View Evidence Timeline
            <span className="ml-auto text-xs text-muted-foreground">
              See what the AI based this on →
            </span>
          </Link>
        </>
      ) : (
        <>
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-64 w-full" />
        </>
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