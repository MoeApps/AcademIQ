"use client";

import { Award, CheckCircle2, AlertTriangle, AlertCircle } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { performanceStyle } from "@/lib/status";
import type { PerformanceStatus } from "@/lib/types";

const STATUS_CONFIG: Record<
  PerformanceStatus,
  { copy: string; icon: typeof CheckCircle2; color: string }
> = {
  Good: {
    copy: "You're tracking well in this course. Keep your current pace.",
    icon: CheckCircle2,
    color: "var(--brand-green)",
  },
  Average: {
    copy: "Solid footing with room to push into the high-performer band.",
    icon: AlertTriangle,
    color: "var(--brand-orange)",
  },
  "At Risk": {
    copy: "This course needs attention. Review the insights for what to fix first.",
    icon: AlertCircle,
    color: "#ef4444",
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ background: `color-mix(in srgb, ${config.color} 12%, transparent)` }}
          >
            <Award className="h-4 w-4" style={{ color: config.color }} />
          </div>
          <div>
            <CardTitle>Performance Status</CardTitle>
            <CardDescription>From the student-clustering model</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] }}
          className="flex items-center gap-3 rounded-xl border p-4"
          style={{
            borderColor: `color-mix(in srgb, ${config.color} 25%, transparent)`,
            background: `color-mix(in srgb, ${config.color} 5%, transparent)`,
          }}
        >
          <StatusIcon className="h-8 w-8 shrink-0" style={{ color: config.color }} />
          <div>
            <div className="flex items-center gap-2">
              <Badge variant={style.variant} className="text-sm">
                {status}
              </Badge>
              {scopeLabel && (
                <span className="text-xs text-muted-foreground italic">({scopeLabel})</span>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{config.copy}</p>
          </div>
        </motion.div>
      </CardContent>
    </Card>
  );
}
