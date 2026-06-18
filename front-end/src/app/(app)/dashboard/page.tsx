"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, FileQuestion, LineChart } from "lucide-react";
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

export default function DashboardPage() {
  const { user } = useUser();
  const [data, setData] = useState<DashboardData | null>(null);
  const [predictionHistory, setPredictionHistory] = useState<PredictionHistoryPoint[] | null>(
    null,
  );

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
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Welcome back, {firstName}
        </h1>
        <p className="text-muted-foreground">
          Here&apos;s a one-glance overview of your academic health.
        </p>
      </div>

      {data ? (
        <QuickStatsCard stats={data.stats} />
      ) : (
        <Skeleton className="h-28 w-full" />
      )}

      <div className="grid gap-6 lg:grid-cols-3">
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
      </div>

      {predictionHistory ? (
        <PerformanceTrendChart data={predictionHistory} />
      ) : (
        <Skeleton className="h-80 w-full" />
      )}

      <div className="grid gap-6 sm:grid-cols-2">
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
      </div>
    </div>
  );
}