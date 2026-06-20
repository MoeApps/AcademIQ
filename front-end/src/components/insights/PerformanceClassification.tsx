"use client";

import { CheckCircle2, AlertCircle, Sparkles, ShieldCheck, ShieldAlert } from "lucide-react";
import { motion, useReducedMotion, useInView } from "framer-motion";
import { useRef } from "react";
import { Badge } from "@/components/ui/badge";

interface Props {
  isHighPerformer: boolean;
  summary: string;
}

export function PerformanceClassification({ isHighPerformer, summary }: Props) {
  const prefersReducedMotion = useReducedMotion();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });

  const color = isHighPerformer ? "var(--brand-green)" : "var(--brand-orange)";
  const Icon = isHighPerformer ? ShieldCheck : ShieldAlert;

  return (
    <div ref={ref} className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card">
      <div
        className="pointer-events-none absolute -left-20 -top-20 h-56 w-56 rounded-full opacity-0 blur-3xl transition-opacity duration-700 group-hover:opacity-[0.1]"
        style={{ background: color }}
      />

      <div className="relative p-6">
        <div className="mb-5 flex items-center gap-2">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-lg"
            style={{ background: `color-mix(in srgb, ${color} 14%, transparent)` }}
          >
            <Sparkles className="h-3.5 w-3.5" style={{ color }} />
          </div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            AI Classification
          </p>
        </div>

        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 12 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={
            prefersReducedMotion
              ? { duration: 0 }
              : { duration: 0.6, delay: 0.1, ease: [0.25, 1, 0.5, 1] as [number, number, number, number] }
          }
          className="rounded-xl border p-5"
          style={{
            borderColor: `color-mix(in srgb, ${color} 20%, transparent)`,
            background: `linear-gradient(135deg, color-mix(in srgb, ${color} 6%, transparent), color-mix(in srgb, ${color} 2%, transparent))`,
          }}
        >
          <div className="flex items-start gap-4">
            <motion.div
              initial={prefersReducedMotion ? {} : { scale: 0, rotate: -20 }}
              animate={inView ? { scale: 1, rotate: 0 } : {}}
              transition={
                prefersReducedMotion
                  ? { duration: 0 }
                  : { type: "spring" as const, stiffness: 260, damping: 18, delay: 0.3 }
              }
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl"
              style={{ background: `color-mix(in srgb, ${color} 15%, transparent)` }}
            >
              <Icon className="h-7 w-7" style={{ color }} />
            </motion.div>
            <div className="space-y-2.5">
              <Badge
                variant={isHighPerformer ? "success" : "warning"}
                className="text-sm font-bold px-3 py-1"
              >
                {isHighPerformer ? "High Performer" : "Not a High Performer"}
              </Badge>
              <p className="text-sm leading-relaxed text-muted-foreground">{summary}</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
