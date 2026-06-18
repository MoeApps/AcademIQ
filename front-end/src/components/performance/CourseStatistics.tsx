"use client";

import { ClipboardList, Clock, FileCheck2, CalendarClock } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnimatedNumber } from "@/components/ui/animated-number";
import type { CourseStatistics as Stats, TaskBreakdown } from "@/lib/types";

const taskCardVariant = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.08,
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
    },
  }),
};

const noMotion = {
  hidden: { opacity: 1, y: 0 },
  visible: { opacity: 1, y: 0 },
};

function TaskRow({
  icon: Icon,
  label,
  breakdown,
  color,
  index,
  prefersReducedMotion,
}: {
  icon: typeof ClipboardList;
  label: string;
  breakdown: TaskBreakdown;
  color: string;
  index: number;
  prefersReducedMotion: boolean;
}) {
  const completionPct =
    breakdown.total > 0 ? (breakdown.attempted / breakdown.total) * 100 : 0;

  return (
    <motion.div
      custom={index}
      variants={prefersReducedMotion ? noMotion : taskCardVariant}
      initial="hidden"
      animate="visible"
      className="overflow-hidden rounded-xl border border-border bg-background"
    >
      <div className="flex items-center gap-4 p-4">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ background: `color-mix(in srgb, ${color} 12%, transparent)` }}
        >
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground">
            {breakdown.attempted} of {breakdown.total} attempted
          </p>
        </div>
        <div className="text-right">
          <div className="flex items-baseline gap-0.5">
            <AnimatedNumber
              value={breakdown.averageScore}
              className="text-xl font-bold text-foreground"
            />
            <span className="text-sm text-muted-foreground">%</span>
          </div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">avg score</p>
        </div>
      </div>
      <div className="h-1 w-full bg-muted">
        <motion.div
          className="h-full"
          style={{ background: color }}
          initial={prefersReducedMotion ? { width: `${completionPct}%` } : { width: 0 }}
          animate={{ width: `${completionPct}%` }}
          transition={
            prefersReducedMotion
              ? { duration: 0 }
              : { duration: 0.8, delay: index * 0.08, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] }
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
  color,
  index,
  prefersReducedMotion,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
  color: string;
  index: number;
  prefersReducedMotion: boolean;
}) {
  return (
    <motion.div
      custom={index}
      variants={prefersReducedMotion ? noMotion : taskCardVariant}
      initial="hidden"
      animate="visible"
      className="flex items-center gap-4 rounded-xl border border-border bg-background p-4"
    >
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        style={{ background: `color-mix(in srgb, ${color} 12%, transparent)` }}
      >
        <Icon className="h-5 w-5" style={{ color }} />
      </div>
      <div>
        <p className="text-lg font-bold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </motion.div>
  );
}

export function CourseStatistics({ stats }: { stats: Stats }) {
  const prefersReducedMotion = !!useReducedMotion();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ background: "color-mix(in srgb, var(--brand-steel) 12%, transparent)" }}
          >
            <ClipboardList className="h-4 w-4 text-[var(--brand-steel)]" />
          </div>
          <CardTitle>Course Statistics</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <TaskRow
          icon={ClipboardList}
          label="Quizzes"
          breakdown={stats.quizzes}
          color="var(--brand-steel)"
          index={0}
          prefersReducedMotion={prefersReducedMotion}
        />
        <TaskRow
          icon={FileCheck2}
          label="Assignments"
          breakdown={stats.assignments}
          color="var(--brand-green)"
          index={1}
          prefersReducedMotion={prefersReducedMotion}
        />
        <TimeRow
          icon={Clock}
          label="Total time on course"
          value={`${stats.totalTimeHours.toFixed(1)} h`}
          color="var(--brand-medblue)"
          index={2}
          prefersReducedMotion={prefersReducedMotion}
        />
        <TimeRow
          icon={CalendarClock}
          label="Weekly-average study time"
          value={`${stats.weeklyAverageHours.toFixed(1)} h`}
          color="var(--brand-orange)"
          index={3}
          prefersReducedMotion={prefersReducedMotion}
        />
      </CardContent>
    </Card>
  );
}
