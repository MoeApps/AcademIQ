"use client";

/**
 * /evidence  — Student Evidence Timeline page.
 *
 * Sits alongside /insights in the (app) group so it inherits AppHeader + AuthGuard.
 * Accessed via the Insights page "View Evidence" link or directly via /evidence.
 */

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { api } from "@/lib/api";
import type { EvidenceTimelineResponse } from "@/lib/types";
import { EvidenceTimeline } from "@/components/timeline/EvidenceTimeline";
import { Skeleton } from "@/components/ui/skeleton";

function EvidenceContent() {
  const searchParams = useSearchParams();
  const courseParam = searchParams.get("course") ?? undefined;

  const [data, setData] = useState<EvidenceTimelineResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const result = await api.getTimeline(courseParam);
        if (active) setData(result);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Failed to load timeline.");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [courseParam]);

  return (
    <div className="space-y-6">
      <Link
        href="/insights"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Insights
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-foreground">Student Evidence Timeline</h1>
        <p className="text-muted-foreground">
          {courseParam
            ? `Course ${courseParam} — learning behaviour evidence`
            : "Your complete learning behaviour history across all courses."}
        </p>
      </div>

      {loading || !data ? (
        <EvidenceTimeline
          data={{ student_id: "", timeline: [], summary: { total_events: 0, risk_signals: 0, positive_signals: 0 } }}
          loading={loading}
          error={!loading ? error : null}
        />
      ) : (
        <EvidenceTimeline data={data} error={error} />
      )}
    </div>
  );
}

export default function EvidencePage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <EvidenceContent />
    </Suspense>
  );
}