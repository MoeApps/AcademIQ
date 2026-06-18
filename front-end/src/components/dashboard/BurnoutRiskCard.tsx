"use client";

import { Activity } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { burnoutStyle } from "@/lib/status";
import { cn } from "@/lib/utils";
import type { BurnoutStatus } from "@/lib/types";

const LEVEL_ORDER = ["Safe", "Low Risk", "Medium Risk", "High Risk"] as const;

const SEGMENT_COLORS: Record<string, string> = {
  "text-success": "var(--brand-green)",
  "text-primary": "var(--brand-steel)",
  "text-warning": "var(--brand-orange)",
  "text-destructive": "hsl(var(--destructive))",
};

export function BurnoutRiskCard({ burnout }: { burnout: BurnoutStatus }) {
  const style = burnoutStyle(burnout.level);
  const activeIndex = LEVEL_ORDER.indexOf(burnout.level);
  const prefersReducedMotion = useReducedMotion();
  const fillColor = SEGMENT_COLORS[style.text] ?? "var(--brand-steel)";

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Activity className={cn("h-5 w-5", style.text)} />
          <CardTitle>Burnout Risk</CardTitle>
        </div>
        <CardDescription>Based on total study time across all courses</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <Badge variant={style.variant} className="w-fit text-sm">
          {burnout.level}
        </Badge>

        {/* Four-segment level meter with animated fill */}
        <div className="flex h-2.5 gap-1.5">
          {LEVEL_ORDER.map((level, i) => {
            const isActive = i <= activeIndex;
            return (
              <div
                key={level}
                className="relative flex-1 overflow-hidden rounded-full bg-muted"
              >
                {isActive && (
                  <motion.div
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{ backgroundColor: fillColor }}
                    initial={
                      prefersReducedMotion
                        ? { width: "100%" }
                        : { width: "0%" }
                    }
                    animate={{ width: "100%" }}
                    transition={
                      prefersReducedMotion
                        ? { duration: 0 }
                        : {
                            duration: 0.5,
                            delay: i * 0.15,
                            ease: [0.25, 0.46, 0.45, 0.94],
                          }
                    }
                  />
                )}
              </div>
            );
          })}
        </div>

        <p className="text-sm text-muted-foreground">{burnout.message}</p>
      </CardContent>
    </Card>
  );
}
