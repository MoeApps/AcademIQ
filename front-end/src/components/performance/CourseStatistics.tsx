"use client";

import { ClipboardList, Clock, FileCheck2, CalendarClock } from "lucide-react";
import { motion, useReducedMotion, useInView } from "framer-motion";
import { useRef } from "react";
import { AnimatedNumber } from "@/components/ui/animated-number";
import type { CourseStatistics as Stats, TaskBreakdown } from "@/lib/types";

function TaskRow({
  icon: Icon,
  label,
  breakdown,
  color,
  index,
  prefersReducedMotion,
  inView,
}: {
  icon: typeof ClipboardList;
  label: string;
  breakdown: TaskBreakdown;
  color: string;
  index: number;
  prefersReducedMotion: boolean;
  inView: boolean;
}) {
  const completionPct =
    breakdown.total > 0 ? (breakdown.attempted / breakdown.total) * 100 : 0;

  return (
    <motion.div
      initial={prefersReducedMotion ? {} : { opacity: 0, y: 16 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={
        prefersReducedMotion
          ? { duration: 0 }
          : { duration: 0.5, delay: index * 0.1, ease: [0.25, 1, 0.5, 1] as [number, number, number, number] }
      }
      className="group/stat relative overflow-hidden rounded-xl border border-border/60 bg-background transition-all duration-200 hover:border-border hover:shadow-md hover:-translate-y-0.5"
    >
      {/* Hover glow */}
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover/stat:opacity-[0.15]"
        style={{ background: color }}
      />
      <div className="relative flex items-center gap-4 p-4">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover/stat:scale-110"
          style={{ background: `color-mix(in srgb, ${color} 12%, transparent)` }}
        >
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground">
            {breakdown.attempted} of {breakdown.total} attempted
          </p>
        </div>
        <div className="text-right">
          <div className="flex items-baseline gap-0.5">
            <AnimatedNumber
              value={breakdown.averageScore}
              className="text-2xl font-extrabold tracking-tight text-foreground"
            />
            <span className="text-sm font-medium text-muted-foreground">%</span>
          </div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">avg score</p>
        </div>
      </div>
      {/* Animated completion bar */}
      <div className="h-1 w-full bg-muted/40">
        <motion.div
          className="h-full"
          style={{ background: color }}
          initial={prefersReducedMotion ? { width: `${completionPct}%` } : { width: 0 }}
          animate={inView ? { width: `${completionPct}%` } : {}}
          transition={
            prefersReducedMotion
              ? { duration: 0 }
              : { duration: 1, delay: index * 0.1 + 0.2, ease: [0.25, 1, 0.5, 1] as [number, number, number, number] }
          }
        />
      </div>
    </motion.div>
  );
}

function TimeRow({
  icon: Icon,
  label,
  value,
  numericValue,
  unit,
  color,
  index,
  prefersReducedMotion,
  inView,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
  numericValue: number;
  unit: string;
  color: string;
  index: number;
  prefersReducedMotion: boolean;
  inView: boolean;
}) {
  return (
    <motion.div
      initial={prefersReducedMotion ? {} : { opacity: 0, y: 16 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={
        prefersReducedMotion
          ? { duration: 0 }
          : { duration: 0.5, delay: index * 0.1, ease: [0.25, 1, 0.5, 1] as [number, number, number, number] }
      }
      className="group/stat relative overflow-hidden rounded-xl border border-border/60 bg-background transition-all duration-200 hover:border-border hover:shadow-md hover:-translate-y-0.5"
    >
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover/stat:opacity-[0.15]"
        style={{ background: color }}
      />
      <div className="relative flex items-center gap-4 p-4">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover/stat:scale-110"
          style={{ background: `color-mix(in srgb, ${color} 12%, transparent)` }}
        >
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
        <div>
          <div className="flex items-baseline gap-1">
            <AnimatedNumber
              value={numericValue}
              formatFn={(n) => n.toFixed(1)}
              className="text-2xl font-extrabold tracking-tight text-foreground"
            />
            <span className="text-sm font-medium text-muted-foreground">{unit}</span>
          </div>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    </motion.div>
  );
}

export function CourseStatistics({ stats }: { stats: Stats }) {
  const prefersReducedMotion = !!useReducedMotion();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });

  return (
    <div ref={ref} className="space-y-4">
      <div className="flex items-center gap-2">
        <div
          className="flex h-7 w-7 items-center justify-center rounded-lg"
          style={{ background: "color-mix(in srgb, var(--brand-steel) 14%, transparent)" }}
        >
          <ClipboardList className="h-3.5 w-3.5 text-[var(--brand-steel)]" />
        </div>
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Course Statistics
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <TaskRow
          icon={ClipboardList}
          label="Quizzes"
          breakdown={stats.quizzes}
          color="var(--brand-steel)"
          index={0}
          prefersReducedMotion={prefersReducedMotion}
          inView={inView}
        />
        <TaskRow
          icon={FileCheck2}
          label="Assignments"
          breakdown={stats.assignments}
          color="var(--brand-green)"
          index={1}
          prefersReducedMotion={prefersReducedMotion}
          inView={inView}
        />
        <TimeRow
          icon={Clock}
          label="Total time on course"
          value={`${stats.totalTimeHours.toFixed(1)} h`}
          numericValue={stats.totalTimeHours}
          unit="h"
          color="var(--brand-medblue)"
          index={2}
          prefersReducedMotion={prefersReducedMotion}
          inView={inView}
        />
        <TimeRow
          icon={CalendarClock}
          label="Weekly-average study time"
          value={`${stats.weeklyAverageHours.toFixed(1)} h`}
          numericValue={stats.weeklyAverageHours}
          unit="h/wk"
          color="var(--brand-orange)"
          index={3}
          prefersReducedMotion={prefersReducedMotion}
          inView={inView}
        />
      </div>
    </div>
  );
}
