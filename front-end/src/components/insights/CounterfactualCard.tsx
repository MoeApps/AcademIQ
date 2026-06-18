"use client";

import { ArrowRight, CheckCircle2, TrendingUp } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ background: "color-mix(in srgb, var(--brand-steel) 12%, transparent)" }}
          >
            <TrendingUp className="h-4 w-4 text-[var(--brand-steel)]" />
          </div>
          <div>
            <CardTitle>What Would It Take?</CardTitle>
            <CardDescription>
              A what-if projection from the model — shows the smallest behavioural changes
              that would move your classification.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {alreadyHighPerformer ? (
          <div
            className="flex items-center gap-3 rounded-xl border p-5"
            style={{
              borderColor: "color-mix(in srgb, var(--brand-green) 25%, transparent)",
              background: "color-mix(in srgb, var(--brand-green) 5%, transparent)",
            }}
          >
            <CheckCircle2 className="h-6 w-6 shrink-0 text-[var(--brand-green)]" />
            <p className="text-sm font-medium text-foreground">
              Already High Performer — no changes needed right now.
            </p>
          </div>
        ) : (
          <>
            {/* Probability comparison */}
            <div className="flex items-center gap-4 rounded-xl border border-border p-5">
              <div className="flex-1 text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Current
                </p>
                <p className="mt-1 text-3xl font-bold text-foreground">
                  {pct(data.originalProbability)}
                </p>
              </div>

              <div className="flex flex-col items-center gap-1">
                <ArrowRight className="h-5 w-5 text-[var(--brand-steel)]" />
                <Badge
                  variant={data.probabilityGain > 0 ? "success" : "muted"}
                  className="text-xs"
                >
                  +{pct(data.probabilityGain)}
                </Badge>
              </div>

              <div className="flex-1 text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Projected
                </p>
                <p className="mt-1 text-3xl font-bold text-[var(--brand-green)]">
                  {pct(data.newProbability)}
                </p>
              </div>
            </div>

            {/* Changes needed */}
            {data.changesNeeded.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                The model couldn&apos;t identify a clear set of changes from your
                current data. Try syncing more recent activity first.
              </p>
            ) : (
              <div className="space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  What would need to change
                </p>
                {data.changesNeeded.map((change, i) => (
                  <motion.div
                    key={change.feature}
                    initial={prefersReducedMotion ? {} : { opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      duration: 0.3,
                      delay: i * 0.06,
                      ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
                    }}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background p-4"
                  >
                    <p className="text-sm font-medium text-foreground">
                      {change.friendlyLabel}
                    </p>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="rounded-md bg-muted px-2 py-0.5 text-muted-foreground">
                        {Math.round(change.from * 10) / 10}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 text-[var(--brand-steel)]" />
                      <span className="rounded-md bg-[var(--brand-green)]/10 px-2 py-0.5 font-semibold text-[var(--brand-green)]">
                        {Math.round(change.to * 10) / 10}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            <p className="text-xs italic text-muted-foreground/80">
              This is a what-if projection based on patterns in past student
              data — it estimates direction and scale, not a guaranteed
              outcome for you specifically.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
