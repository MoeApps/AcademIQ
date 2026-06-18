"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useReducedMotion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { StudyTimePoint } from "@/lib/types";

const PRIMARY = "#6C8EBF";

export function StudyTimeTrendChart({ data }: { data: StudyTimePoint[] }) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Study Time Trend</CardTitle>
        <CardDescription>Weekly study time over the past three weeks</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="studyFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={PRIMARY} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={PRIMARY} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                width={40}
                unit="h"
              />
              <Tooltip
                cursor={{ stroke: PRIMARY, strokeWidth: 1, strokeOpacity: 0.3 }}
                formatter={(value) => [`${value} h`, "Study time"]}
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid hsl(var(--border))",
                  background: "hsl(var(--popover))",
                  color: "hsl(var(--popover-foreground))",
                  fontSize: 12,
                }}
              />
              <Area
                type="monotone"
                dataKey="hours"
                stroke={PRIMARY}
                strokeWidth={2}
                fill="url(#studyFill)"
                isAnimationActive={!prefersReducedMotion}
                animationDuration={1200}
                animationEasing="ease-out"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
