"use client";

import { ArrowDown, ArrowUp, Minus, TrendingUp } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
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
  { label: string; icon: typeof ArrowUp; badgeVariant: "success" | "destructive" | "muted"; color: string }
> = {
  improving: { label: "Improving", icon: ArrowUp, badgeVariant: "success", color: "var(--brand-green)" },
  declining: { label: "Declining", icon: ArrowDown, badgeVariant: "destructive", color: "#ef4444" },
  stable: { label: "Stable", icon: Minus, badgeVariant: "muted", color: "var(--brand-steel)" },
};

function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function TrendSummaryCard({ data }: Props) {
  const prefersReducedMotion = useReducedMotion();

  if (!data.hasEnoughData) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ background: "color-mix(in srgb, var(--brand-steel) 12%, transparent)" }}
            >
              <TrendingUp className="h-4 w-4 text-[var(--brand-steel)]" />
            </div>
            <div>
              <CardTitle>Prediction Trend</CardTitle>
              <CardDescription>How your classification has moved between syncs</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              Sync a few more times to start seeing your performance trend.
            </p>
          </div>
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
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ background: `color-mix(in srgb, ${config.color} 12%, transparent)` }}
          >
            <TrendingUp className="h-4 w-4" style={{ color: config.color }} />
          </div>
          <div>
            <CardTitle>Prediction Trend</CardTitle>
            <CardDescription>How your classification has moved between syncs</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center gap-4 rounded-xl border border-border p-5">
          <div className="flex-1 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              From
            </p>
            <p className="mt-1 text-3xl font-bold text-foreground">
              {data.fromProbability !== undefined ? pct(data.fromProbability) : "—"}
            </p>
          </div>

          <motion.div
            initial={prefersReducedMotion ? {} : { opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="flex flex-col items-center gap-1"
          >
            <Badge variant={config.badgeVariant} className="flex items-center gap-1">
              <Icon className="h-3.5 w-3.5" />
              {config.label}
            </Badge>
          </motion.div>

          <div className="flex-1 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              To
            </p>
            <p className="mt-1 text-3xl font-bold" style={{ color: config.color }}>
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
