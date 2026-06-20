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
import { motion, useReducedMotion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import type { PredictionHistoryPoint } from "@/lib/types";

const PRIMARY = "#2E86AB";

interface ChartPoint {
  label: string;
  percent: number;
}

function toChartPoints(data: PredictionHistoryPoint[]): ChartPoint[] {
  return data.map((point) => ({
    label: new Date(point.date).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    }),
    percent: Math.round(point.probability * 100),
  }));
}

function badgeColor(percent: number): string {
  if (percent >= 65) return "var(--brand-green)";
  if (percent >= 40) return "var(--brand-orange)";
  return "hsl(var(--destructive))";
}

export function PerformanceTrendChart({ data }: { data: PredictionHistoryPoint[] }) {
  const prefersReducedMotion = useReducedMotion();

  if (data.length < 2) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Performance Trend</CardTitle>
          <CardDescription>
            How your predicted High-Performer probability has moved over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 flex-col items-center justify-center gap-2 text-center">
            <TrendingUp className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm font-medium text-muted-foreground">
              Sync a few more times to start seeing your performance trend
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = toChartPoints(data);
  const latestPercent = chartData[chartData.length - 1].percent;
  const bgColor = badgeColor(latestPercent);

  return (
    <motion.div
      initial={prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        prefersReducedMotion
          ? { duration: 0 }
          : { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }
      }
    >
      <Card className="relative">
        {/* Floating probability badge */}
        <motion.div
          className="absolute right-4 top-4 z-10 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold text-white shadow-lg"
          style={{ backgroundColor: bgColor }}
          initial={
            prefersReducedMotion
              ? { scale: 1, opacity: 1 }
              : { scale: 0, opacity: 0 }
          }
          animate={{ scale: 1, opacity: 1 }}
          transition={
            prefersReducedMotion
              ? { duration: 0 }
              : {
                  type: "spring",
                  stiffness: 400,
                  damping: 15,
                  delay: 0.3,
                }
          }
        >
          <TrendingUp className="h-3.5 w-3.5" />
          {latestPercent}%
        </motion.div>

        <CardHeader>
          <CardTitle>Performance Trend</CardTitle>
          <CardDescription>
            How your predicted High-Performer probability has moved over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="performanceFill" x1="0" y1="0" x2="0" y2="1">
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
                  domain={[0, 100]}
                  unit="%"
                />
                <Tooltip
                  cursor={{ stroke: PRIMARY, strokeWidth: 1, strokeOpacity: 0.3 }}
                  formatter={(value) => [`${value}%`, "High-Performer probability"]}
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
                  dataKey="percent"
                  stroke={PRIMARY}
                  strokeWidth={2}
                  fill="url(#performanceFill)"
                  isAnimationActive={!prefersReducedMotion}
                  animationDuration={1200}
                  animationEasing="ease-out"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
