"use client";

import { Lightbulb } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import type { RiskFactor } from "@/lib/types";

type RiskLevel = "High" | "Medium" | "Low";

function riskLevel(impact: number): {
  level: RiskLevel;
  badge: "destructive" | "warning" | "default";
  color: string;
} {
  if (impact >= 60) {
    return { level: "High", badge: "destructive", color: "#ef4444" };
  }
  if (impact >= 35) {
    return { level: "Medium", badge: "warning", color: "var(--brand-orange)" };
  }
  return { level: "Low", badge: "default", color: "var(--brand-steel)" };
}

interface Props {
  rank: number;
  factor: RiskFactor;
  index: number;
}

export function RiskFactorCard({ rank, factor, index }: Props) {
  const { level, badge, color } = riskLevel(factor.impact);
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={prefersReducedMotion ? {} : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay: index * 0.08,
        ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
      }}
      className="overflow-hidden rounded-xl border border-border bg-background"
    >
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
              style={{ background: color }}
            >
              {rank}
            </span>
            <p className="font-semibold text-foreground">{factor.title}</p>
          </div>
          <Badge variant={badge} className="shrink-0">
            {level} · {factor.impact}
          </Badge>
        </div>

        <p className="mt-2 text-sm text-muted-foreground sm:ml-10">
          {factor.description}
        </p>

        {/* Impact bar */}
        <div className="mt-3 sm:ml-10">
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <motion.div
              className="h-full rounded-full"
              style={{ background: color }}
              initial={prefersReducedMotion ? { width: `${factor.impact}%` } : { width: 0 }}
              animate={{ width: `${factor.impact}%` }}
              transition={
                prefersReducedMotion
                  ? { duration: 0 }
                  : { duration: 0.8, delay: index * 0.08 + 0.2, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] }
              }
            />
          </div>
        </div>
      </div>

      {/* Recommendation strip */}
      <div
        className="flex items-start gap-3 border-t px-4 py-3 sm:px-5"
        style={{
          borderColor: `color-mix(in srgb, var(--brand-steel) 15%, transparent)`,
          background: "color-mix(in srgb, var(--brand-steel) 4%, transparent)",
        }}
      >
        <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand-steel)]" />
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--brand-steel)]">
            Recommendation
          </p>
          <p className="text-sm text-foreground">{factor.recommendation}</p>
        </div>
      </div>
    </motion.div>
  );
}
