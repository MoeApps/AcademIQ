"use client";

import { Target, Zap } from "lucide-react";
import { motion, useReducedMotion, useInView } from "framer-motion";
import { useRef } from "react";
import { AnimatedNumber } from "@/components/ui/animated-number";

interface PredictedGradeCardProps {
  grade: number | null;
}

export function PredictedGradeCard({ grade }: PredictedGradeCardProps) {
  const prefersReducedMotion = useReducedMotion();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });

  const color =
    grade === null
      ? "var(--brand-steel)"
      : grade >= 65
        ? "var(--brand-green)"
        : grade >= 40
          ? "var(--brand-orange)"
          : "#ef4444";

  const label =
    grade === null
      ? "Awaiting data"
      : grade >= 80
        ? "Excellent"
        : grade >= 65
          ? "Strong"
          : grade >= 40
            ? "Needs work"
            : "Critical";

  const pct = grade !== null ? Math.max(0, Math.min(100, grade)) : 0;
  const R = 58;
  const circumference = 2 * Math.PI * R;
  const strokeDashoffset = circumference - (pct / 100) * circumference;

  return (
    <div
      ref={ref}
      className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card"
    >
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-0 blur-3xl transition-opacity duration-700 group-hover:opacity-[0.12]"
        style={{ background: color }}
      />

      <div className="relative p-6">
        <div className="mb-1 flex items-center gap-2">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-lg"
            style={{ background: `color-mix(in srgb, ${color} 14%, transparent)` }}
          >
            <Target className="h-3.5 w-3.5" style={{ color }} />
          </div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Predicted Grade
          </p>
        </div>

        {grade !== null ? (
          <div className="mt-4 flex items-center gap-5">
            {/* Circular gauge */}
            <div className="relative flex h-36 w-36 shrink-0 items-center justify-center">
              {/* Outer glow ring */}
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{
                  background: `conic-gradient(${color} ${pct * 3.6}deg, transparent ${pct * 3.6}deg)`,
                  filter: "blur(12px)",
                }}
                initial={{ opacity: 0 }}
                animate={inView ? { opacity: 0.15 } : { opacity: 0 }}
                transition={prefersReducedMotion ? { duration: 0 } : { duration: 1.5, delay: 0.5 }}
              />
              <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r={R}
                  fill="none"
                  stroke="hsl(var(--muted))"
                  strokeWidth="7"
                />
                <motion.circle
                  cx="64"
                  cy="64"
                  r={R}
                  fill="none"
                  stroke={color}
                  strokeWidth="7"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  initial={{ strokeDashoffset: circumference }}
                  animate={inView ? { strokeDashoffset } : { strokeDashoffset: circumference }}
                  transition={
                    prefersReducedMotion
                      ? { duration: 0 }
                      : { duration: 1.4, ease: [0.25, 1, 0.5, 1] as [number, number, number, number], delay: 0.15 }
                  }
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <AnimatedNumber
                  value={grade}
                  className="text-4xl font-extrabold tracking-tight text-foreground"
                />
                <span className="mt-0.5 text-[11px] font-medium text-muted-foreground">/ 100</span>
              </div>
            </div>

            {/* Detail column */}
            <div className="flex-1 space-y-3">
              <motion.div
                initial={prefersReducedMotion ? {} : { opacity: 0, x: 12 }}
                animate={inView ? { opacity: 1, x: 0 } : {}}
                transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.5, delay: 0.6, ease: [0.25, 1, 0.5, 1] as [number, number, number, number] }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold"
                    style={{
                      color,
                      background: `color-mix(in srgb, ${color} 12%, transparent)`,
                    }}
                  >
                    <Zap className="h-3 w-3" />
                    {label}
                  </span>
                </div>
                <p className="mt-2 text-sm font-medium text-foreground/80">
                  ML regression model prediction
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Based on quiz scores, assignment completions, and study patterns
                  from your Moodle activity.
                </p>
              </motion.div>
            </div>
          </div>
        ) : (
          <motion.div
            initial={prefersReducedMotion ? {} : { opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-5 flex items-center gap-4 rounded-xl border border-dashed border-border p-5"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted">
              <Target className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              No graded items available yet. Grades will appear here after your
              first submission is marked.
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
