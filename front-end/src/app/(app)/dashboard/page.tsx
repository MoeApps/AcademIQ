"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, FileQuestion, LineChart } from "lucide-react";
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
  },
  {
    href: "/quiz",
    icon: FileQuestion,
    title: "Quiz Generation",
    description: "Generate practice quizzes from your lecture materials.",
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
        className="relative overflow-hidden rounded-xl px-6 py-8"
        style={{
          background:
            "linear-gradient(135deg, var(--brand-navy) 0%, var(--brand-steel) 100%)",
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 70% 30%, white 0%, transparent 60%)",
          }}
        />
        <h1 className="relative text-2xl font-bold text-white">
          Welcome back, {firstName}
        </h1>
        <p className="relative mt-1 text-white/70">
          Here&apos;s a one-glance overview of your academic health.
        </p>
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

      <motion.div
        custom={4}
        variants={variants}
        initial="hidden"
        animate="visible"
        className="grid gap-6 sm:grid-cols-2"
      >
        {FEATURE_LINKS.map(({ href, icon: Icon, title, description }) => (
          <Link key={href} href={href} className="group">
            <Card className="h-full transition-all hover:border-primary/50 hover:shadow-lg">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-6 w-6 text-primary" />
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
