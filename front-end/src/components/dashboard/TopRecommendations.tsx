"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Lightbulb, ArrowRight, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import type { RiskFactor } from "@/lib/types";

interface Recommendation {
  courseCode: string;
  courseId: string;
  factor: RiskFactor;
}

const itemVariant = {
  hidden: { opacity: 0, x: -10 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: i * 0.08,
      duration: 0.35,
      ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
    },
  }),
};

const noMotion = {
  hidden: { opacity: 1, x: 0 },
  visible: { opacity: 1, x: 0 },
};

export function TopRecommendations() {
  const [recs, setRecs] = useState<Recommendation[] | null>(null);
  const prefersReducedMotion = useReducedMotion();
  const variants = prefersReducedMotion ? noMotion : itemVariant;

  useEffect(() => {
    let active = true;

    async function load() {
      const courses = await api.getCourses();
      const allInsights = await Promise.all(
        courses.map((c) =>
          api.getInsights(c.id).then((ins) => ({
            courseCode: c.code,
            courseId: c.id,
            factors: ins.riskFactors,
          })),
        ),
      );

      if (!active) return;

      const all: Recommendation[] = [];
      for (const ins of allInsights) {
        for (const f of ins.factors) {
          all.push({ courseCode: ins.courseCode, courseId: ins.courseId, factor: f });
        }
      }
      all.sort((a, b) => b.factor.impact - a.factor.impact);
      setRecs(all.slice(0, 3));
    }

    load().catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  if (!recs || recs.length === 0) return null;

  const impactColor = (impact: number) =>
    impact >= 60 ? "#ef4444" : impact >= 35 ? "var(--brand-orange)" : "var(--brand-steel)";

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
        <div className="flex items-center gap-2">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-lg"
            style={{ background: "color-mix(in srgb, var(--brand-orange) 12%, transparent)" }}
          >
            <Lightbulb className="h-3.5 w-3.5 text-[var(--brand-orange)]" />
          </div>
          <span className="text-sm font-semibold text-card-foreground">
            Top Recommendations
          </span>
        </div>
        <Link
          href="/insights"
          className="flex items-center gap-1 text-xs font-medium text-[var(--brand-steel)] transition-colors hover:text-[var(--brand-steel-light)]"
        >
          All insights
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="divide-y divide-border">
        {recs.map((rec, i) => (
          <motion.div
            key={`${rec.courseId}-${rec.factor.title}`}
            custom={i}
            variants={variants}
            initial="hidden"
            animate="visible"
            className="flex items-start gap-3 px-5 py-4"
          >
            <div
              className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
              style={{
                background: `color-mix(in srgb, ${impactColor(rec.factor.impact)} 12%, transparent)`,
              }}
            >
              <AlertCircle className="h-3.5 w-3.5" style={{ color: impactColor(rec.factor.impact) }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-foreground">{rec.factor.title}</p>
                <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
                  {rec.courseCode}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                {rec.factor.recommendation}
              </p>
            </div>
            <div className="mt-1 h-1.5 w-10 shrink-0 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${rec.factor.impact}%`,
                  background: impactColor(rec.factor.impact),
                }}
              />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
