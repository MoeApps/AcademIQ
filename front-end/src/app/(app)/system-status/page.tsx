"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Database,
  RefreshCw,
  Server,
  Sparkles,
  XCircle,
} from "lucide-react";

import {
  getSystemStatus,
  type SystemComponentStatus,
  type SystemStatusResponse,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type StatusRowProps = {
  label: string;
  ok: boolean;
  status: string;
  details?: string;
};

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
        ok
          ? "bg-emerald-500/10 text-emerald-600"
          : "bg-destructive/10 text-destructive",
      )}
    >
      {ok ? (
        <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
      ) : (
        <XCircle className="mr-1 h-3.5 w-3.5" />
      )}
      {label}
    </span>
  );
}

function StatusRow({ label, ok, status, details }: StatusRowProps) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <p className="font-medium text-foreground">{label}</p>
        {details ? (
          <p className="text-sm text-muted-foreground">{details}</p>
        ) : null}
      </div>

      <StatusPill ok={ok} label={status} />
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Server;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div>
        <h2 className="font-semibold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function formatLastSync(value?: string | null) {
  if (!value) return "No sync has been recorded yet.";

  const syncDate = new Date(value);

  if (Number.isNaN(syncDate.getTime())) {
    return "Last sync time is unavailable.";
  }

  const diffMs = Date.now() - syncDate.getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));

  if (diffMinutes < 1) return "Last sync just now.";
  if (diffMinutes === 1) return "Last sync 1 minute ago.";
  if (diffMinutes < 60) return `Last sync ${diffMinutes} minutes ago.`;

  const diffHours = Math.floor(diffMinutes / 60);

  if (diffHours === 1) return "Last sync 1 hour ago.";
  if (diffHours < 24) return `Last sync ${diffHours} hours ago.`;

  const diffDays = Math.floor(diffHours / 24);

  return diffDays === 1
    ? "Last sync 1 day ago."
    : `Last sync ${diffDays} days ago.`;
}

function componentOk(component?: SystemComponentStatus) {
  return Boolean(
    component?.connected || component?.loaded || component?.available,
  );
}

export default function SystemStatusPage() {
  const [status, setStatus] = useState<SystemStatusResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadStatus() {
    try {
      setError("");
      const data = await getSystemStatus();
      setStatus(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not connect to the backend.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    async function run() {
      try {
        const data = await getSystemStatus();

        if (active) {
          setStatus(data);
          setError("");
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not connect to the backend.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    run();

    const interval = window.setInterval(run, 30000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  const summary = useMemo(() => {
    if (!status) return { ready: 0, total: 0 };

    const checks = [
      componentOk(status.backend),
      componentOk(status.mongodb),
      Boolean(status.extension_sync?.last_sync_at),
      componentOk(status.ai.performance_model),
      componentOk(status.ai.shap_explainer),
      componentOk(status.ai.grade_prediction_model),
      componentOk(status.ai.risk_cluster_model),
      componentOk(status.ai.quiz_generator),
      status.runtime.frontend_mode === "Live Backend",
      status.runtime.mock_mode === false,
      status.runtime.heuristic_fallback === false,
    ];

    return {
      ready: checks.filter(Boolean).length,
      total: checks.length,
    };
  }, [status]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">System Status</h1>
          <p className="text-muted-foreground">
            Checking AcademIQ live intelligence services...
          </p>
        </div>

        <Card>
          <CardContent className="flex items-center gap-3 p-6 text-muted-foreground">
            <RefreshCw className="h-5 w-5 animate-spin" />
            Loading system status...
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !status) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">System Status</h1>
          <p className="text-muted-foreground">
            AcademIQ live backend health check.
          </p>
        </div>

        <Card className="border-destructive/40">
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center gap-3 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <div>
                <p className="font-semibold">Backend disconnected</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>

            <Button variant="outline" onClick={loadStatus}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!status) return null;

  const ai = status.ai;
  const runtime = status.runtime;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">System Status</h1>
          <p className="text-muted-foreground">
            Live intelligence and infrastructure health check for AcademIQ.
          </p>
        </div>

        <div className="rounded-lg border bg-card px-4 py-3 text-sm">
          <p className="text-muted-foreground">Ready checks</p>
          <p className="text-xl font-bold text-foreground">
            {summary.ready}/{summary.total}
          </p>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Latest refresh failed: {error}
        </div>
      ) : null}

      <Card>
        <CardContent className="space-y-5 p-6">
          <SectionHeader
            icon={Server}
            title="Core Infrastructure"
            description="Backend, database, and extension sync state."
          />

          <div className="grid gap-3">
            <StatusRow
              label="Backend"
              ok={Boolean(status.backend.connected)}
              status={status.backend.status}
              details={status.backend.details}
            />

            <StatusRow
              label="MongoDB"
              ok={Boolean(status.mongodb.connected)}
              status={status.mongodb.status}
              details={status.mongodb.details}
            />

            <StatusRow
              label="Extension Sync"
              ok={Boolean(status.extension_sync.last_sync_at)}
              status={
                status.extension_sync.last_sync_at
                  ? "Synced"
                  : status.extension_sync.status
              }
              details={formatLastSync(status.extension_sync.last_sync_at)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-5 p-6">
          <SectionHeader
            icon={Sparkles}
            title="AI Intelligence Layer"
            description="Loaded models, explainability, clustering, and quiz generation."
          />

          <div className="grid gap-3">
            <StatusRow
              label="Performance Model"
              ok={Boolean(ai.performance_model.loaded)}
              status={ai.performance_model.status}
              details={ai.performance_model.details}
            />

            <StatusRow
              label="SHAP Explainer"
              ok={Boolean(ai.shap_explainer.loaded)}
              status={ai.shap_explainer.status}
              details={ai.shap_explainer.details}
            />

            <StatusRow
              label="Grade Prediction Model"
              ok={Boolean(ai.grade_prediction_model.loaded)}
              status={ai.grade_prediction_model.status}
              details={ai.grade_prediction_model.details}
            />

            <StatusRow
              label="Risk Cluster Model"
              ok={Boolean(ai.risk_cluster_model.loaded)}
              status={ai.risk_cluster_model.status}
              details={ai.risk_cluster_model.details}
            />

            <StatusRow
              label="Quiz Generator"
              ok={Boolean(ai.quiz_generator.available)}
              status={ai.quiz_generator.status}
              details={ai.quiz_generator.details}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-5 p-6">
          <SectionHeader
            icon={Activity}
            title="Runtime Mode"
            description="Confirms whether the UI is using live backend data."
          />

          <div className="grid gap-3">
            <StatusRow
              label="Frontend Mode"
              ok={runtime.frontend_mode === "Live Backend"}
              status={runtime.frontend_mode}
              details="Shows whether the frontend is connected to the real backend API."
            />

            <StatusRow
              label="Mock Mode"
              ok={runtime.mock_mode === false}
              status={runtime.mock_mode ? "Enabled" : "Disabled"}
              details="Mock mode should be disabled during the final project discussion."
            />

            <StatusRow
              label="Heuristic Fallback"
              ok={runtime.heuristic_fallback === false}
              status={runtime.heuristic_fallback ? "Enabled" : "Disabled"}
              details="Heuristic fallback becomes disabled when the real AI models are loaded."
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4" />
          Last checked: {new Date(runtime.checked_at).toLocaleString()}
        </div>

        <Button variant="outline" size="sm" onClick={loadStatus}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>
    </div>
  );
}