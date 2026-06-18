"use client";

import { CheckCircle2, AlertCircle, Sparkles } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Props {
  isHighPerformer: boolean;
  summary: string;
}

export function PerformanceClassification({ isHighPerformer, summary }: Props) {
  const prefersReducedMotion = useReducedMotion();
  const Icon = isHighPerformer ? CheckCircle2 : AlertCircle;
  const color = isHighPerformer ? "var(--brand-green)" : "var(--brand-orange)";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ background: `color-mix(in srgb, ${color} 12%, transparent)` }}
          >
            <Sparkles className="h-4 w-4" style={{ color }} />
          </div>
          <div>
            <CardTitle>Performance Classification</CardTitle>
            <CardDescription>How the AI analysis classifies you</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] }}
          className="rounded-xl border p-5"
          style={{
            borderColor: `color-mix(in srgb, ${color} 25%, transparent)`,
            background: `color-mix(in srgb, ${color} 4%, transparent)`,
          }}
        >
          <div className="flex items-start gap-4">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
              style={{ background: `color-mix(in srgb, ${color} 15%, transparent)` }}
            >
              <Icon className="h-6 w-6" style={{ color }} />
            </div>
            <div className="space-y-2">
              <Badge variant={isHighPerformer ? "success" : "warning"} className="text-sm">
                {isHighPerformer ? "High Performer" : "Not a High Performer"}
              </Badge>
              <p className="text-sm leading-relaxed text-muted-foreground">{summary}</p>
            </div>
          </div>
        </motion.div>
      </CardContent>
    </Card>
  );
}
