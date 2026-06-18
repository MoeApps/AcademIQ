"use client";

import { BarChart3, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface CourseAverageCardProps {
  courseAverage: number;
  predictedGrade: number | null;
}

export function CourseAverageCard({ courseAverage, predictedGrade }: CourseAverageCardProps) {
  const prefersReducedMotion = useReducedMotion();
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
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ background: "color-mix(in srgb, var(--brand-medblue) 12%, transparent)" }}
          >
            <BarChart3 className="h-4 w-4 text-[var(--brand-medblue)]" />
          </div>
          <div>
            <CardTitle>Course Average</CardTitle>
            <CardDescription>Actual average across all graded Moodle tasks</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {hasAverage ? (
          <div className="space-y-4">
            <div className="flex items-end gap-6">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Actual
                </p>
                <p className="text-4xl font-bold text-foreground">
                  {courseAverage.toFixed(1)}
                  <span className="text-lg font-normal text-muted-foreground"> / 100</span>
                </p>
              </div>
              {hasPredicted && (
                <div className="pb-1">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Predicted
                  </p>
                  <p className="text-2xl font-bold text-muted-foreground/70">
                    {predictedGrade.toFixed(1)}
                  </p>
                </div>
              )}
            </div>

            {/* Progress bar showing actual vs predicted */}
            <div className="relative h-3 overflow-hidden rounded-full bg-muted">
              <motion.div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{ background: "var(--brand-medblue)" }}
                initial={prefersReducedMotion ? { width: `${courseAverage}%` } : { width: 0 }}
                animate={{ width: `${courseAverage}%` }}
                transition={
                  prefersReducedMotion
                    ? { duration: 0 }
                    : { duration: 1, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] }
                }
              />
              {hasPredicted && (
                <div
                  className="absolute top-0 h-full w-0.5"
                  style={{
                    left: `${Math.min(predictedGrade, 100)}%`,
                    background: deltaColor,
                  }}
                />
              )}
            </div>

            {delta !== null && Math.abs(delta) >= 0.5 && (
              <div
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
                style={{
                  background: `color-mix(in srgb, ${deltaColor} 8%, transparent)`,
                  color: deltaColor,
                }}
              >
                <DeltaIcon className="h-4 w-4 shrink-0" />
                <span>
                  {delta > 0
                    ? `Model expects a ${delta.toFixed(1)}-pt improvement`
                    : `Model expects a ${Math.abs(delta).toFixed(1)}-pt drop`}
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-4 rounded-lg border border-border bg-muted/30 p-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted">
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              No graded items recorded for this course yet. Your average will
              appear here after grades are published on Moodle.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
