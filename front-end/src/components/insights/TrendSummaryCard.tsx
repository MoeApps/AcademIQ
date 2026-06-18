import { ArrowDown, ArrowUp, Minus, TrendingUp } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { PredictionTrendResponse, TrendDirection } from "@/lib/types";

interface Props {
  data: PredictionTrendResponse;
}

const DIRECTION_CONFIG: Record<
  TrendDirection,
  { label: string; icon: typeof ArrowUp; badgeVariant: "success" | "destructive" | "muted" }
> = {
  improving: { label: "Improving", icon: ArrowUp, badgeVariant: "success" },
  declining: { label: "Declining", icon: ArrowDown, badgeVariant: "destructive" },
  stable: { label: "Stable", icon: Minus, badgeVariant: "muted" },
};

/** Format a 0–1 probability as a whole-number percentage. */
function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

/**
 * Prediction Trend summary card.
 *
 * Compares the student's two most recent prediction snapshots and surfaces
 * the direction plus a SHAP-delta-based narrative — phrased as a change in
 * the model's attention to a feature, never as a raw-behaviour-direction
 * claim, since only `shap_map` is stored server-side (not raw feature
 * values) — see `prediction_history.get_trend_summary`.
 */
export function TrendSummaryCard({ data }: Props) {
  if (!data.hasEnoughData) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <CardTitle>Prediction Trend</CardTitle>
          </div>
          <CardDescription>
            How your behavioural classification has moved between syncs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
            Sync a few more times to start seeing your performance trend
          </p>
        </CardContent>
      </Card>
    );
  }

  const direction = data.direction ?? "stable";
  const config = DIRECTION_CONFIG[direction];
  const Icon = config.icon;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <CardTitle>Prediction Trend</CardTitle>
        </div>
        <CardDescription>
          How your behavioural classification has moved between syncs.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 p-4">
          <div className="text-center">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">From</p>
            <p className="text-2xl font-bold text-foreground">
              {data.fromProbability !== undefined ? pct(data.fromProbability) : "—"}
            </p>
          </div>

          <Badge variant={config.badgeVariant} className="flex shrink-0 items-center gap-1">
            <Icon className="h-3.5 w-3.5" />
            {config.label}
          </Badge>

          <div className="text-center">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">To</p>
            <p className="text-2xl font-bold text-primary">
              {data.toProbability !== undefined ? pct(data.toProbability) : "—"}
            </p>
          </div>
        </div>

        {data.summary && (
          <p className="text-sm text-foreground">
            Since your last sync, the model is picking up{" "}
            <span className="font-medium">{data.summary}</span>.
          </p>
        )}

        <p className="text-xs italic text-muted-foreground/80">
          This compares your two most recent syncs — it reflects the model&apos;s
          attention to behavioural factors, not a guarantee about your raw
          activity numbers.
        </p>
      </CardContent>
    </Card>
  );
}
