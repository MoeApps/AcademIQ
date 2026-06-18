"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUp, ArrowDown, Minus, TrendingUp } from "lucide-react";
import { api } from "@/lib/api";
import type { PredictionTrendResponse, TrendDirection } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

const DIRECTION_MAP: Record<
  TrendDirection,
  { label: string; icon: typeof ArrowUp; color: string; badgeVariant: "success" | "destructive" | "muted" }
> = {
  improving: { label: "Improving", icon: ArrowUp, color: "var(--brand-green)", badgeVariant: "success" },
  declining: { label: "Declining", icon: ArrowDown, color: "#ef4444", badgeVariant: "destructive" },
  stable: { label: "Stable", icon: Minus, color: "var(--brand-steel)", badgeVariant: "muted" },
};

function pct(v: number) {
  return `${Math.round(v * 100)}%`;
}

export function TrendSnapshotCard() {
  const [trend, setTrend] = useState<PredictionTrendResponse | null>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    let active = true;
    api.getPredictionTrend().then((d) => {
      if (active) setTrend(d);
    });
    return () => {
      active = false;
    };
  }, []);

  if (!trend || !trend.hasEnoughData) return null;

  const dir = trend.direction ?? "stable";
  const cfg = DIRECTION_MAP[dir];
  const Icon = cfg.icon;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border px-5 py-3.5">
        <div
          className="flex h-7 w-7 items-center justify-center rounded-lg"
          style={{ background: `color-mix(in srgb, ${cfg.color} 12%, transparent)` }}
        >
          <TrendingUp className="h-3.5 w-3.5" style={{ color: cfg.color }} />
        </div>
        <span className="text-sm font-semibold text-card-foreground">Prediction Trend</span>
      </div>
      <div className="px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              From
            </p>
            <p className="text-2xl font-bold text-foreground">
              {trend.fromProbability !== undefined ? pct(trend.fromProbability) : "—"}
            </p>
          </div>
          <motion.div
            initial={prefersReducedMotion ? {} : { opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <Badge variant={cfg.badgeVariant} className="flex items-center gap-1">
              <Icon className="h-3.5 w-3.5" />
              {cfg.label}
            </Badge>
          </motion.div>
          <div className="text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              To
            </p>
            <p className="text-2xl font-bold" style={{ color: cfg.color }}>
              {trend.toProbability !== undefined ? pct(trend.toProbability) : "—"}
            </p>
          </div>
        </div>
        {trend.summary && (
          <p className="mt-3 text-xs text-muted-foreground">
            The model is picking up <span className="font-medium text-foreground">{trend.summary}</span>.
          </p>
        )}
      </div>
    </div>
  );
}
