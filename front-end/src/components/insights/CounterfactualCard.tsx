"use client";

import { ArrowRight, CheckCircle2, TrendingUp, Sparkles } from "lucide-react";
import { motion, useReducedMotion, useInView } from "framer-motion";
import { useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { AnimatedNumber } from "@/components/ui/animated-number";
import type { CounterfactualResponse } from "@/lib/types";

interface Props {
  data: CounterfactualResponse;
}

function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function CounterfactualCard({ data }: Props) {
  const alreadyHighPerformer = data.status === "Already classified as High Performer";
  const prefersReducedMotion = useReducedMotion();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });

  return (
    <div ref={ref} className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card">
      <div
        className="pointer-events-none absolute -right-24 -bottom-24 h-64 w-64 rounded-full opacity-0 blur-3xl transition-opacity duration-700 group-hover:opacity-[0.08]"
        style={{ background: "var(--brand-steel)" }}
      />

      <div className="relative p-6">
        <div className="mb-5 flex items-center gap-2">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-lg"
            style={{ background: "color-mix(in srgb, var(--brand-steel) 14%, transparent)" }}
          >
            <Sparkles className="h-3.5 w-3.5 text-[var(--brand-steel)]" />
          </div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            What Would It Take?
          </p>
        </div>

        {alreadyHighPerformer ? (
          <motion.div
            initial={prefersReducedMotion ? {} : { opacity: 0, y: 8 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.5, delay: 0.1 }}
            className="rounded-xl border p-6"
            style={{
              borderColor: "color-mix(in srgb, var(--brand-green) 25%, transparent)",
              background: "linear-gradient(135deg, color-mix(in srgb, var(--brand-green) 6%, transparent), color-mix(in srgb, var(--brand-green) 2%, transparent))",
            }}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-green)]/10">
                <CheckCircle2 className="h-6 w-6 text-[var(--brand-green)]" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Already High Performer</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  No behavioural changes needed right now. Keep your current pace.
                </p>
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="space-y-5">
            {/* Probability comparison — hero visual */}
            <motion.div
              initial={prefersReducedMotion ? {} : { opacity: 0, y: 12 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.6, delay: 0.1, ease: [0.25, 1, 0.5, 1] as [number, number, number, number] }}
              className="relative overflow-hidden rounded-xl border border-border/60 p-6"
            >
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.03]"
                style={{
                  backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)",
                  backgroundSize: "20px 20px",
                }}
              />
              <div className="relative flex items-center justify-between gap-4">
                <div className="text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Current
                  </p>
                  <p className="mt-2 text-4xl font-extrabold tracking-tight text-foreground">
                    <AnimatedNumber
                      value={Math.round(data.originalProbability * 100)}
                      formatFn={(n) => `${Math.round(n)}%`}
                    />
                  </p>
                </div>

                <div className="flex flex-col items-center gap-2">
                  <motion.div
                    initial={prefersReducedMotion ? {} : { scale: 0 }}
                    animate={inView ? { scale: 1 } : {}}
                    transition={
                      prefersReducedMotion
                        ? { duration: 0 }
                        : { type: "spring" as const, stiffness: 260, damping: 20, delay: 0.5 }
                    }
                    className="flex h-10 w-10 items-center justify-center rounded-full"
                    style={{ background: "color-mix(in srgb, var(--brand-steel) 12%, transparent)" }}
                  >
                    <ArrowRight className="h-5 w-5 text-[var(--brand-steel)]" />
                  </motion.div>
                  <Badge
                    variant={data.probabilityGain > 0 ? "success" : "muted"}
                    className="text-xs font-bold"
                  >
                    +{pct(data.probabilityGain)}
                  </Badge>
                </div>

                <div className="text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Projected
                  </p>
                  <p className="mt-2 text-4xl font-extrabold tracking-tight text-[var(--brand-green)]">
                    <AnimatedNumber
                      value={Math.round(data.newProbability * 100)}
                      formatFn={(n) => `${Math.round(n)}%`}
                    />
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Changes needed */}
            {data.changesNeeded.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                The model couldn&apos;t identify a clear set of changes from your
                current data. Try syncing more recent activity first.
              </p>
            ) : (
              <div className="space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Behavioural changes needed
                </p>
                {data.changesNeeded.map((change, i) => (
                  <motion.div
                    key={change.feature}
                    initial={prefersReducedMotion ? {} : { opacity: 0, x: -12 }}
                    animate={inView ? { opacity: 1, x: 0 } : {}}
                    transition={
                      prefersReducedMotion
                        ? { duration: 0 }
                        : { duration: 0.4, delay: 0.3 + i * 0.08, ease: [0.25, 1, 0.5, 1] as [number, number, number, number] }
                    }
                    className="group/change flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background p-4 transition-all duration-200 hover:border-border hover:shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-bold text-muted-foreground">
                        {i + 1}
                      </div>
                      <p className="text-sm font-medium text-foreground">
                        {change.friendlyLabel}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="rounded-lg bg-muted px-2.5 py-1 font-mono text-xs text-muted-foreground">
                        {Math.round(change.from * 10) / 10}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 text-[var(--brand-steel)] transition-transform duration-200 group-hover/change:translate-x-0.5" />
                      <span className="rounded-lg px-2.5 py-1 font-mono text-xs font-bold text-[var(--brand-green)]" style={{ background: "color-mix(in srgb, var(--brand-green) 10%, transparent)" }}>
                        {Math.round(change.to * 10) / 10}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            <p className="text-[11px] italic text-muted-foreground/60">
              What-if projection based on patterns in past student data — estimates direction
              and scale, not a guaranteed outcome.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
