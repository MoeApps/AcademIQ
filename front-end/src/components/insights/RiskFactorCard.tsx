"use client";

import { Lightbulb, ArrowRight } from "lucide-react";
import { motion, useReducedMotion, useInView } from "framer-motion";
import { useRef } from "react";
import { Badge } from "@/components/ui/badge";
import type { RiskFactor } from "@/lib/types";

type RiskLevel = "High" | "Medium" | "Low";

function riskLevel(impact: number): {
  level: RiskLevel;
  badge: "destructive" | "warning" | "default";
  color: string;
} {
  if (impact >= 60) return { level: "High", badge: "destructive", color: "#ef4444" };
  if (impact >= 35) return { level: "Medium", badge: "warning", color: "var(--brand-orange)" };
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
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-30px" });

  return (
    <motion.div
      ref={ref}
      initial={prefersReducedMotion ? {} : { opacity: 0, y: 16 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={
        prefersReducedMotion
          ? { duration: 0 }
          : { duration: 0.5, delay: index * 0.08, ease: [0.25, 1, 0.5, 1] as [number, number, number, number] }
      }
      className="group/risk relative overflow-hidden rounded-2xl border border-border/60 bg-background transition-all duration-200 hover:border-border hover:shadow-md"
    >
      {/* Hover glow */}
      <div
        className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover/risk:opacity-[0.12]"
        style={{ background: color }}
      />

      <div className="relative p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <motion.span
              initial={prefersReducedMotion ? {} : { scale: 0 }}
              animate={inView ? { scale: 1 } : {}}
              transition={
                prefersReducedMotion
                  ? { duration: 0 }
                  : { type: "spring" as const, stiffness: 300, damping: 20, delay: index * 0.08 + 0.15 }
              }
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow-sm"
              style={{ background: color }}
            >
              {rank}
            </motion.span>
            <div>
              <p className="font-semibold text-foreground">{factor.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {factor.description}
              </p>
            </div>
          </div>
          <Badge variant={badge} className="shrink-0 font-bold">
            {level} · {factor.impact}
          </Badge>
        </div>

        {/* Impact bar */}
        <div className="mt-4 ml-11">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <span>Impact</span>
            <span>{factor.impact}%</span>
          </div>
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted/50">
            <motion.div
              className="h-full rounded-full"
              style={{ background: `linear-gradient(90deg, ${color}, color-mix(in srgb, ${color} 70%, white))` }}
              initial={prefersReducedMotion ? { width: `${factor.impact}%` } : { width: 0 }}
              animate={inView ? { width: `${factor.impact}%` } : {}}
              transition={
                prefersReducedMotion
                  ? { duration: 0 }
                  : { duration: 1, delay: index * 0.08 + 0.25, ease: [0.25, 1, 0.5, 1] as [number, number, number, number] }
              }
            />
          </div>
        </div>
      </div>

      {/* Recommendation strip */}
      <div
        className="flex items-start gap-3 border-t px-5 py-4"
        style={{
          borderColor: `color-mix(in srgb, var(--brand-steel) 12%, transparent)`,
          background: "color-mix(in srgb, var(--brand-steel) 3%, transparent)",
        }}
      >
        <div
          className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg"
          style={{ background: "color-mix(in srgb, var(--brand-steel) 12%, transparent)" }}
        >
          <Lightbulb className="h-3 w-3 text-[var(--brand-steel)]" />
        </div>
        <div className="flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--brand-steel)]">
            Recommendation
          </p>
          <p className="mt-0.5 text-sm leading-relaxed text-foreground/80">{factor.recommendation}</p>
        </div>
      </div>
    </motion.div>
  );
}
