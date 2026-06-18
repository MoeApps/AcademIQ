"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, FileQuestion, LineChart, Brain, Sparkles } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { api } from "@/lib/api";
import type { DashboardData, PredictionHistoryPoint } from "@/lib/types";
import { useUser } from "@/context/UserContext";
import { QuickStatsCard } from "@/components/dashboard/QuickStatsCard";
import { StudyTimeTrendChart } from "@/components/dashboard/StudyTimeTrendChart";
import { BurnoutRiskCard } from "@/components/dashboard/BurnoutRiskCard";
import { PerformanceTrendChart } from "@/components/dashboard/PerformanceTrendChart";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const FEATURE_LINKS = [
  {
    href: "/performance",
    icon: LineChart,
    title: "Performance Analysis",
    description: "Predicted grades, status, and per-course statistics.",
    color: "var(--brand-steel)",
  },
  {
    href: "/insights",
    icon: Brain,
    title: "AI Insights",
    description: "Risk factors, classification, and counterfactual analysis.",
    color: "var(--brand-medblue)",
  },
  {
    href: "/quiz",
    icon: FileQuestion,
    title: "Quiz Generation",
    description: "Generate practice quizzes from your lecture materials.",
    color: "var(--brand-green)",
  },
];

function stagger(i: number) {
  return { delay: i * 0.1 };
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      ...stagger(i),
      duration: 0.5,
      ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
    },
  }),
};

const staticVariant = {
  hidden: { opacity: 1, y: 0 },
  visible: { opacity: 1, y: 0 },
};

export default function DashboardPage() {
  const { user } = useUser();
  const [data, setData] = useState<DashboardData | null>(null);
  const [predictionHistory, setPredictionHistory] = useState<PredictionHistoryPoint[] | null>(
    null,
  );
  const prefersReducedMotion = useReducedMotion();
  const variants = prefersReducedMotion ? staticVariant : fadeUp;

  useEffect(() => {
    let active = true;
    api.getDashboard().then((d) => {
      if (active) setData(d);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    api.getPredictionHistory().then((history) => {
      if (active) setPredictionHistory(history);
    });
    return () => {
      active = false;
    };
  }, []);

  const firstName = user?.fullName.split(" ")[0] ?? "there";

  return (
    <div className="space-y-8">
      {/* Welcome hero strip */}
      <motion.div
        custom={0}
        variants={variants}
        initial="hidden"
        animate="visible"
        className="relative overflow-hidden rounded-xl px-6 py-8 md:px-8 md:py-10"
        style={{
          background:
            "linear-gradient(135deg, var(--brand-navy-deep) 0%, var(--brand-navy) 40%, var(--brand-steel) 100%)",
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 70% 30%, white 0%, transparent 60%)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "radial-gradient(circle, white 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        <div className="relative flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
            <Sparkles className="h-7 w-7 text-[var(--brand-steel-light)]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white md:text-3xl">
              Welcome back, {firstName}
            </h1>
            <p className="mt-1 text-white/60">
              Here&apos;s a one-glance overview of your academic health.
            </p>
          </div>
        </div>
      </motion.div>

      <motion.div
        custom={1}
        variants={variants}
        initial="hidden"
        animate="visible"
      >
        {data ? (
          <QuickStatsCard stats={data.stats} />
        ) : (
          <Skeleton className="h-28 w-full" />
        )}
      </motion.div>

      <motion.div
        custom={2}
        variants={variants}
        initial="hidden"
        animate="visible"
        className="grid gap-6 lg:grid-cols-3"
      >
        <div className="lg:col-span-2">
          {data ? (
            <StudyTimeTrendChart data={data.studyTime} />
          ) : (
            <Skeleton className="h-80 w-full" />
          )}
        </div>
        <div>
          {data ? (
            <BurnoutRiskCard burnout={data.burnout} />
          ) : (
            <Skeleton className="h-80 w-full" />
          )}
        </div>
      </motion.div>

      <motion.div
        custom={3}
        variants={variants}
        initial="hidden"
        animate="visible"
      >
        {predictionHistory ? (
          <PerformanceTrendChart data={predictionHistory} />
        ) : (
          <Skeleton className="h-80 w-full" />
        )}
      </motion.div>

      {/* Feature links */}
      <motion.div
        custom={4}
        variants={variants}
        initial="hidden"
        animate="visible"
        className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
      >
        {FEATURE_LINKS.map(({ href, icon: Icon, title, description, color }) => (
          <Link key={href} href={href} className="group">
            <Card className="h-full transition-all hover:border-[var(--brand-steel)]/40 hover:shadow-lg hover:-translate-y-0.5">
              <CardContent className="flex items-center gap-4 p-5">
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                  style={{ background: `color-mix(in srgb, ${color} 12%, transparent)` }}
                >
                  <Icon className="h-5 w-5" style={{ color }} />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">{title}</h3>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </motion.div>
    </div>
  );
}
