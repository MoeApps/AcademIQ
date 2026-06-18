"use client";

import { Target } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AnimatedNumber } from "@/components/ui/animated-number";

interface PredictedGradeCardProps {
  grade: number | null;
}

export function PredictedGradeCard({ grade }: PredictedGradeCardProps) {
  const prefersReducedMotion = useReducedMotion();

  const color =
    grade === null
      ? "var(--brand-steel)"
      : grade >= 65
        ? "var(--brand-green)"
        : grade >= 40
          ? "var(--brand-orange)"
          : "#ef4444";

  const pct = grade !== null ? Math.max(0, Math.min(100, grade)) : 0;
  const circumference = 2 * Math.PI * 54;
  const strokeDashoffset = circumference - (pct / 100) * circumference;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ background: `color-mix(in srgb, ${color} 12%, transparent)` }}
          >
            <Target className="h-4 w-4" style={{ color }} />
          </div>
          <div>
            <CardTitle>Predicted Grade</CardTitle>
            <CardDescription>
              {grade !== null ? "Based on your current course average" : "Predicted grade"}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {grade !== null ? (
          <div className="flex items-center gap-6">
            <div className="relative flex h-32 w-32 shrink-0 items-center justify-center">
              <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                <circle
                  cx="60"
                  cy="60"
                  r="54"
                  fill="none"
                  stroke="hsl(var(--muted))"
                  strokeWidth="8"
                />
                <motion.circle
                  cx="60"
                  cy="60"
                  r="54"
                  fill="none"
                  stroke={color}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset }}
                  transition={
                    prefersReducedMotion
                      ? { duration: 0 }
                      : { duration: 1.2, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] }
                  }
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <AnimatedNumber
                  value={grade}
                  className="text-3xl font-bold text-foreground"
                />
                <span className="text-xs text-muted-foreground">/ 100</span>
              </div>
            </div>
            <div className="flex-1 space-y-2">
              <p className="text-sm font-medium text-foreground">
                {grade >= 65
                  ? "Strong performance"
                  : grade >= 40
                    ? "Room for improvement"
                    : "Needs attention"}
              </p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                This prediction is based on your quiz scores, assignment completions, and study
                patterns analyzed by the regression model.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4 rounded-lg border border-border bg-muted/30 p-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted">
              <Target className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              No graded items available for this course yet. Grades will appear
              here after your first submission is marked.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
