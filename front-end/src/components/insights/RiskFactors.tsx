"use client";

import { TrendingDown, CheckCircle2 } from "lucide-react";
import { RiskFactorCard } from "./RiskFactorCard";
import type { RiskFactor } from "@/lib/types";

export function RiskFactors({ factors }: { factors: RiskFactor[] }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-lg"
            style={{ background: "color-mix(in srgb, var(--brand-orange) 14%, transparent)" }}
          >
            <TrendingDown className="h-3.5 w-3.5 text-[var(--brand-orange)]" />
          </div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Risk Factors
          </p>
        </div>
        {factors.length > 0 && (
          <span className="text-[11px] text-muted-foreground">
            {factors.length} factor{factors.length !== 1 ? "s" : ""} detected
          </span>
        )}
      </div>

      {factors.length === 0 ? (
        <div className="flex items-center gap-4 rounded-2xl border border-dashed border-[var(--brand-green)]/30 bg-[var(--brand-green)]/[0.03] p-6">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-green)]/10">
            <CheckCircle2 className="h-6 w-6 text-[var(--brand-green)]" />
          </div>
          <div>
            <p className="font-medium text-foreground">All clear</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              No significant risk factors detected for this course. Keep it up!
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {factors.map((factor, i) => (
            <RiskFactorCard key={factor.title} rank={i + 1} factor={factor} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
