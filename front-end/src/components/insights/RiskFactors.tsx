import { TrendingDown } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RiskFactorCard } from "./RiskFactorCard";
import type { RiskFactor } from "@/lib/types";

export function RiskFactors({ factors }: { factors: RiskFactor[] }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <TrendingDown className="h-5 w-5 text-destructive" />
          <CardTitle>Risk Factors</CardTitle>
        </div>
        <CardDescription>
          Factors most negatively affecting your predicted performance, ranked by impact —
          each with a recommended next step
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {factors.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No significant risk factors detected for this course.
          </p>
        ) : (
          factors.map((factor, i) => (
            <RiskFactorCard key={factor.title} rank={i + 1} factor={factor} />
          ))
        )}
      </CardContent>
    </Card>
  );
}
