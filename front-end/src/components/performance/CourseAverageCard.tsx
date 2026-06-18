"use client";

import { BarChart3, TrendingUp, TrendingDown, Minus, ArrowRight } from "lucide-react";
import { motion, useReducedMotion, useInView } from "framer-motion";
import { useRef } from "react";
import { AnimatedNumber } from "@/components/ui/animated-number";

interface CourseAverageCardProps {
  courseAverage: number;
  predictedGrade: number | null;
}

export function CourseAverageCard({ courseAverage, predictedGrade }: CourseAverageCardProps) {
  const prefersReducedMotion = useReducedMotion();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const hasAverage = courseAverage > 0;
  const hasPredicted = predictedGrade !== null && predictedGrade > 0;

  const delta = hasAverage && hasPredicted ? predictedGrade - courseAverage : null;
  const DeltaIcon =
    delta === null || Math.abs(delta) < 0.5
      ? Minus
      : delta > 0
        ? TrendingUp
        : TrendingDown;
  const deltaColor =
    delta === null || Math.abs(delta) < 0.5
      ? "var(--brand-steel)"
      : delta > 0
        ? "var(--brand-green)"
        : "var(--brand-orange)";

  return (
    <div ref={ref} className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card">
      <div
        className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full opacity-0 blur-3xl transition-opacity duration-700 group-hover:opacity-[0.08]"
        style={{ background: "var(--brand-medblue)" }}
      />
      <div className="relative p-6">
        <div className="mb-5 flex items-center gap-2">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-lg"
            style={{ background: "color-mix(in srgb, var(--brand-medblue) 14%, transparent)" }}
          >
            <BarChart3 className="h-3.5 w-3.5 text-[var(--brand-medblue)]" />
          </div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Course Average
          </p>
        </div>

        {hasAverage ? (
          <div className="space-y-5">
            {/* Numbers row */}
            <div className="flex items-end gap-6">
              <motion.div
                initial={prefersReducedMotion ? {} : { opacity: 0, y: 10 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.5, delay: 0.1, ease: [0.25, 1, 0.5, 1] as [number, number, number, number] }}
              >
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Actual
                </p>
                <div className="flex items-baseline gap-1">
                  <AnimatedNumber
                    value={courseAverage}
                    formatFn={(n) => n.toFixed(1)}
                    className="text-4xl font-extrabold tracking-tight text-foreground"
                  />
                  <span className="text-base font-normal text-muted-foreground/60">/ 100</span>
                </div>
              </motion.div>

              {hasPredicted && (
                <motion.div
                  initial={prefersReducedMotion ? {} : { opacity: 0, y: 10 }}
                  animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.5, delay: 0.25, ease: [0.25, 1, 0.5, 1] as [number, number, number, number] }}
                  className="pb-1"
                >
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Predicted
                  </p>
                  <p className="text-2xl font-bold text-muted-foreground/50">
                    {predictedGrade.toFixed(1)}
                  </p>
                </motion.div>
              )}

              {delta !== null && Math.abs(delta) >= 0.5 && (
                <motion.div
                  initial={prefersReducedMotion ? {} : { opacity: 0, scale: 0.8 }}
                  animate={inView ? { opacity: 1, scale: 1 } : {}}
                  transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.4, delay: 0.4, ease: [0.25, 1, 0.5, 1] as [number, number, number, number] }}
                  className="mb-1 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold"
                  style={{
                    color: deltaColor,
                    background: `color-mix(in srgb, ${deltaColor} 10%, transparent)`,
                  }}
                >
                  <DeltaIcon className="h-3.5 w-3.5" />
                  {delta > 0 ? "+" : ""}{delta.toFixed(1)} pts
                </motion.div>
              )}
            </div>

            {/* Dual-layer progress bar */}
            <div className="relative">
              <div className="h-3 w-full overflow-hidden rounded-full bg-muted/60">
                {hasPredicted && (
                  <motion.div
                    className="absolute inset-y-0 left-0 rounded-full opacity-30"
                    style={{ background: "var(--brand-medblue)" }}
                    initial={prefersReducedMotion ? { width: `${predictedGrade}%` } : { width: 0 }}
                    animate={inView ? { width: `${Math.min(predictedGrade, 100)}%` } : {}}
                    transition={
                      prefersReducedMotion
                        ? { duration: 0 }
                        : { duration: 1.2, delay: 0.3, ease: [0.25, 1, 0.5, 1] as [number, number, number, number] }
                    }
                  />
                )}
                <motion.div
                  className="relative h-full rounded-full"
                  style={{ background: "var(--brand-medblue)" }}
                  initial={prefersReducedMotion ? { width: `${courseAverage}%` } : { width: 0 }}
                  animate={inView ? { width: `${courseAverage}%` } : {}}
                  transition={
                    prefersReducedMotion
                      ? { duration: 0 }
                      : { duration: 1, delay: 0.15, ease: [0.25, 1, 0.5, 1] as [number, number, number, number] }
                  }
                />
              </div>
              {hasPredicted && (
                <motion.div
                  className="absolute top-0 h-full w-0.5"
                  style={{ background: deltaColor }}
                  initial={prefersReducedMotion ? { left: `${Math.min(predictedGrade, 100)}%` } : { left: 0, opacity: 0 }}
                  animate={inView ? { left: `${Math.min(predictedGrade, 100)}%`, opacity: 1 } : {}}
                  transition={prefersReducedMotion ? { duration: 0 } : { duration: 1.2, delay: 0.3, ease: [0.25, 1, 0.5, 1] as [number, number, number, number] }}
                />
              )}
            </div>

            {delta !== null && Math.abs(delta) >= 0.5 && (
              <p className="text-xs text-muted-foreground">
                {delta > 0
                  ? `The model expects a ${delta.toFixed(1)}-point improvement over your current average.`
                  : `The model expects a ${Math.abs(delta).toFixed(1)}-point drop from your current average.`}
              </p>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-4 rounded-xl border border-dashed border-border p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted">
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              No graded items recorded yet. Your average will appear here after
              grades are published on Moodle.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
