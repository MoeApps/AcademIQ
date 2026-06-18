"use client";

import { TrendingDown } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RiskFactorCard } from "./RiskFactorCard";
import type { RiskFactor } from "@/lib/types";

export function RiskFactors({ factors }: { factors: RiskFactor[] }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ background: "color-mix(in srgb, var(--brand-orange) 12%, transparent)" }}
          >
            <TrendingDown className="h-4 w-4 text-[var(--brand-orange)]" />
          </div>
          <div>
            <CardTitle>Risk Factors</CardTitle>
            <CardDescription>
              Factors most negatively affecting your predicted performance, ranked by impact
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {factors.length === 0 ? (
          <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--brand-green)]/10">
              <span className="text-lg">✓</span>
            </div>
            <p className="text-sm text-muted-foreground">
              No significant risk factors detected for this course.
            </p>
          </div>
        ) : (
          factors.map((factor, i) => (
            <RiskFactorCard key={factor.title} rank={i + 1} factor={factor} index={i} />
          ))
        )}
      </CardContent>
    </Card>
  );
}
