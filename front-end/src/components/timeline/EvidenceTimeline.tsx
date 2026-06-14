"use client";

/**
 * EvidenceTimeline
 *
 * Renders the Student Evidence Timeline: a chronological, human-readable log
 * of Moodle behaviour events that explains the AI's risk assessment.
 *
 * Design follows the existing card + badge pattern used throughout the app
 * (see components/insights/ and components/performance/).
 */

import { format, parseISO } from "date-fns";
import {
  AlertCircle,
  AlertTriangle,
  BookOpen,
  CalendarOff,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Clock,
  Info,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type {
  EvidenceTimelineItem,
  EvidenceTimelineResponse,
  TimelineSeverity,
} from "@/lib/types";

// ── Severity colours ───────────────────────────────────────────────────────────

const SEVERITY_CONFIG: Record<
  TimelineSeverity,
  { dot: string; badge: string; label: string }
> = {
  positive: {
    dot: "bg-emerald-500",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    label: "Positive",
  },
  neutral: {
    dot: "bg-slate-400",
    badge: "bg-slate-50 text-slate-600 border-slate-200",
    label: "Neutral",
  },
  warning: {
    dot: "bg-amber-400",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    label: "Warning",
  },
  danger: {
    dot: "bg-red-500",
    badge: "bg-red-50 text-red-700 border-red-200",
    label: "At Risk",
  },
};

// ── Item type → icon mapping ───────────────────────────────────────────────────

function TimelineIcon({ type, severity }: { type: string; severity: TimelineSeverity }) {
  const colour =
    severity === "positive"
      ? "text-emerald-600"
      : severity === "warning"
        ? "text-amber-500"
        : severity === "danger"
          ? "text-red-500"
          : "text-slate-400";

  const props = { className: `h-4 w-4 ${colour}`, strokeWidth: 1.75 };

  switch (type) {
    case "material_view":       return <BookOpen {...props} />;
    case "quiz_attempt":        return <ClipboardCheck {...props} />;
    case "assignment_submission": return <CheckCircle2 {...props} />;
    case "late_submission":     return <AlertTriangle {...props} />;
    case "missed_deadline":     return <CalendarOff {...props} />;
    case "inactivity":          return <Clock {...props} />;
    case "grade_update":        return <TrendingUp {...props} />;
    case "risk_change":         return severity === "positive" ? <TrendingUp {...props} /> : <TrendingDown {...props} />;
    case "recommendation_generated": return <Zap {...props} />;
    case "quiz_generated":      return <RefreshCw {...props} />;
    default:                    return <Info {...props} />;
  }
}

// ── Individual timeline item ───────────────────────────────────────────────────

function TimelineItem({ item }: { item: EvidenceTimelineItem }) {
  const [expanded, setExpanded] = useState(false);
  const sev = SEVERITY_CONFIG[item.severity] ?? SEVERITY_CONFIG.neutral;
  const date = parseISO(item.date);
  const hasMetadata =
    item.metadata && Object.keys(item.metadata).filter((k) => item.metadata![k] != null).length > 0;

  return (
    <div className="flex gap-4">
      {/* Vertical connector line + dot */}
      <div className="flex flex-col items-center">
        <div className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-background ${sev.dot}`} />
        <div className="w-px flex-1 bg-border" />
      </div>

      {/* Content */}
      <div className="pb-6 min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          {/* Date */}
          <time
            dateTime={item.date}
            className="shrink-0 text-xs font-medium text-muted-foreground"
          >
            {format(date, "MMM d")}
            <span className="ml-1 text-muted-foreground/60">{format(date, "HH:mm")}</span>
          </time>

          {/* Severity badge */}
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${sev.badge}`}
          >
            <TimelineIcon type={item.type} severity={item.severity} />
            {sev.label}
          </span>
        </div>

        {/* Label */}
        <p className="mt-1 text-sm font-medium text-foreground leading-snug">{item.label}</p>

        {/* Expandable metadata (course_id, score, etc.) */}
        {hasMetadata && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="mt-1 inline-flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {expanded ? "Hide details" : "Show details"}
          </button>
        )}

        {expanded && hasMetadata && (
          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 rounded-md border bg-muted/40 p-2 text-xs">
            {Object.entries(item.metadata!).map(([k, v]) => {
              if (v == null || v === "") return null;
              return (
                <div key={k} className="contents">
                  <dt className="text-muted-foreground capitalize">{k.replace(/_/g, " ")}</dt>
                  <dd className="font-medium text-foreground truncate">{String(v)}</dd>
                </div>
              );
            })}
          </dl>
        )}
      </div>
    </div>
  );
}

// ── Summary bar ───────────────────────────────────────────────────────────────

function TimelineSummaryBar({ summary }: { summary: EvidenceTimelineResponse["summary"] }) {
  return (
    <div className="flex flex-wrap gap-4 rounded-lg border bg-muted/40 px-4 py-3 text-sm">
      <span className="flex items-center gap-1.5 text-muted-foreground">
        <span className="font-semibold text-foreground">{summary.total_events}</span>
        total events
      </span>
      <span className="flex items-center gap-1.5 text-amber-600">
        <AlertCircle className="h-3.5 w-3.5" />
        <span className="font-semibold">{summary.risk_signals}</span>
        risk signals
      </span>
      <span className="flex items-center gap-1.5 text-emerald-600">
        <CheckCircle2 className="h-3.5 w-3.5" />
        <span className="font-semibold">{summary.positive_signals}</span>
        positive signals
      </span>
      {summary.last_activity && (
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          Last activity {format(parseISO(summary.last_activity), "MMM d, yyyy")}
        </span>
      )}
    </div>
  );
}

// ── Public component ──────────────────────────────────────────────────────────

interface EvidenceTimelineProps {
  data: EvidenceTimelineResponse;
  loading?: boolean;
  error?: string | null;
}

export function EvidenceTimeline({ data, loading, error }: EvidenceTimelineProps) {
  if (loading) {
    return (
      <Card className="p-6 space-y-4">
        <div className="h-5 w-48 animate-pulse rounded bg-muted" />
        <div className="h-3 w-72 animate-pulse rounded bg-muted" />
        <div className="space-y-6 pt-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex gap-4">
              <div className="h-2.5 w-2.5 mt-1 shrink-0 animate-pulse rounded-full bg-muted" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-20 animate-pulse rounded bg-muted" />
                <div className="h-4 w-64 animate-pulse rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="flex items-center gap-3 p-6 border-destructive/30 bg-destructive/5">
        <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />
        <p className="text-sm text-destructive">{error}</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-foreground">Evidence Timeline</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Human-readable evidence explaining your academic risk signals and learning behaviour changes.
        </p>
      </div>

      <TimelineSummaryBar summary={data.summary} />

      {data.timeline.length === 0 ? (
        <div className="mt-8 flex flex-col items-center gap-2 py-8 text-center">
          <Info className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm font-medium text-muted-foreground">No evidence recorded yet</p>
          <p className="text-xs text-muted-foreground/70">
            Sync the Moodle extension to start building your timeline.
          </p>
        </div>
      ) : (
        <div className="mt-6">
          {data.timeline.map((item) => (
            <TimelineItem key={item.id} item={item} />
          ))}
        </div>
      )}
    </Card>
  );
}