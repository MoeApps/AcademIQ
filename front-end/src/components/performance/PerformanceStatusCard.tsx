"use client";

import { Award, CheckCircle2, AlertTriangle, AlertCircle, Shield } from "lucide-react";
import { motion, useReducedMotion, useInView } from "framer-motion";
import { useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { performanceStyle } from "@/lib/status";
import type { PerformanceStatus } from "@/lib/types";

const STATUS_CONFIG: Record<
  PerformanceStatus,
  { copy: string; icon: typeof CheckCircle2; color: string; gradient: string }
> = {
  Good: {
    copy: "You're tracking well in this course. Keep your current pace and you'll finish strong.",
    icon: CheckCircle2,
    color: "var(--brand-green)",
    gradient: "linear-gradient(135deg, color-mix(in srgb, var(--brand-green) 8%, transparent), color-mix(in srgb, var(--brand-green) 2%, transparent))",
  },
  Average: {
    copy: "Solid footing with room to push into the high-performer band. Small improvements now compound.",
    icon: AlertTriangle,
    color: "var(--brand-orange)",
    gradient: "linear-gradient(135deg, color-mix(in srgb, var(--brand-orange) 8%, transparent), color-mix(in srgb, var(--brand-orange) 2%, transparent))",
  },
  "At Risk": {
    copy: "This course needs attention. Review the risk factors below and focus on the top recommendation first.",
    icon: AlertCircle,
    color: "#ef4444",
    gradient: "linear-gradient(135deg, color-mix(in srgb, #ef4444 8%, transparent), color-mix(in srgb, #ef4444 2%, transparent))",
  },
};

interface PerformanceStatusCardProps {
  status: PerformanceStatus;
  scopeLabel?: string;
}

export function PerformanceStatusCard({ status, scopeLabel }: PerformanceStatusCardProps) {
  const style = performanceStyle(status);
  const config = STATUS_CONFIG[status];
  const StatusIcon = config.icon;
  const prefersReducedMotion = useReducedMotion();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });

  return (
    <div
      ref={ref}
      className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card"
    >
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute -left-16 -bottom-16 h-48 w-48 rounded-full opacity-0 blur-3xl transition-opacity duration-700 group-hover:opacity-[0.12]"
        style={{ background: config.color }}
      />

      <div className="relative p-6">
        <div className="mb-1 flex items-center gap-2">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-lg"
            style={{ background: `color-mix(in srgb, ${config.color} 14%, transparent)` }}
          >
            <Shield className="h-3.5 w-3.5" style={{ color: config.color }} />
          </div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Performance Status
          </p>
        </div>

        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 10 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={
            prefersReducedMotion
              ? { duration: 0 }
              : { duration: 0.5, delay: 0.2, ease: [0.25, 1, 0.5, 1] as [number, number, number, number] }
          }
          className="mt-4 rounded-xl border p-5"
          style={{
            borderColor: `color-mix(in srgb, ${config.color} 20%, transparent)`,
            background: config.gradient,
          }}
        >
          <div className="flex items-start gap-4">
            <motion.div
              initial={prefersReducedMotion ? {} : { scale: 0.5, opacity: 0 }}
              animate={inView ? { scale: 1, opacity: 1 } : {}}
              transition={
                prefersReducedMotion
                  ? { duration: 0 }
                  : { type: "spring" as const, stiffness: 260, damping: 20, delay: 0.35 }
              }
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
              style={{ background: `color-mix(in srgb, ${config.color} 15%, transparent)` }}
            >
              <StatusIcon className="h-6 w-6" style={{ color: config.color }} />
            </motion.div>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={style.variant} className="text-sm font-bold">
                  {status}
                </Badge>
                {scopeLabel && (
                  <span className="text-[11px] text-muted-foreground italic">({scopeLabel})</span>
                )}
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">{config.copy}</p>
            </div>
          </div>
        </motion.div>

        <p className="mt-3 text-[11px] text-muted-foreground/60">
          Classified by the student-clustering model
        </p>
      </div>
    </div>
  );
}
