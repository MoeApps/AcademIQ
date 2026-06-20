"use client";

import { motion, useReducedMotion, useInView } from "framer-motion";
import { useRef } from "react";
import {
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  AlertCircle,
  Flame,
} from "lucide-react";

function MockDashboardCard() {
  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-lg">
      <div className="border-b border-border/40 px-5 py-3.5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-card-foreground">Performance Trend</span>
          <span className="rounded-full bg-[var(--brand-green)]/10 px-2.5 py-0.5 text-xs font-bold text-[var(--brand-green)]">
            73%
          </span>
        </div>
      </div>
      <div className="px-5 py-4">
        {/* Mini chart mockup */}
        <svg viewBox="0 0 200 60" className="w-full" fill="none">
          <defs>
            <linearGradient id="mockGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--brand-steel)" stopOpacity="0.3" />
              <stop offset="100%" stopColor="var(--brand-steel)" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <path d="M0 45 Q25 40 50 38 T100 25 T150 20 T200 12" stroke="var(--brand-steel)" strokeWidth="2" fill="none" />
          <path d="M0 45 Q25 40 50 38 T100 25 T150 20 T200 12 V60 H0 Z" fill="url(#mockGrad)" />
        </svg>
        <div className="mt-3 flex items-center gap-1.5 text-xs text-[var(--brand-green)]">
          <TrendingUp className="h-3.5 w-3.5" />
          <span className="font-medium">+12% this month</span>
        </div>
      </div>
    </div>
  );
}

function MockRiskFactors() {
  const factors = [
    { label: "Low quiz attempt rate", impact: 85, status: "danger" },
    { label: "Below-average assignment score", impact: 62, status: "warning" },
    { label: "Consistent study schedule", impact: 45, status: "good" },
  ];
  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-lg">
      <div className="border-b border-border/40 px-5 py-3.5">
        <span className="text-sm font-semibold text-card-foreground">Risk Factors (SHAP)</span>
      </div>
      <div className="divide-y divide-border/40">
        {factors.map((f) => (
          <div key={f.label} className="flex items-center gap-3 px-5 py-3">
            {f.status === "danger" ? (
              <AlertCircle className="h-4 w-4 shrink-0 text-[var(--brand-orange)]" />
            ) : f.status === "warning" ? (
              <Flame className="h-4 w-4 shrink-0 text-[var(--brand-orange)]" />
            ) : (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--brand-green)]" />
            )}
            <span className="flex-1 text-xs text-card-foreground/80">{f.label}</span>
            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${f.impact}%`,
                  background: f.status === "good" ? "var(--brand-green)" : "var(--brand-orange)",
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MockBurnoutMeter() {
  const levels = ["Safe", "Low", "Med", "High"];
  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-lg">
      <div className="border-b border-border/40 px-5 py-3.5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-card-foreground">Burnout Monitor</span>
          <span className="rounded-full bg-[var(--brand-green)]/10 px-2.5 py-0.5 text-xs font-bold text-[var(--brand-green)]">
            Safe
          </span>
        </div>
      </div>
      <div className="px-5 py-4">
        <div className="flex gap-1.5">
          {levels.map((l, i) => (
            <div key={l} className="flex-1">
              <div
                className="h-2 rounded-full"
                style={{
                  background: i === 0 ? "var(--brand-green)" : "hsl(var(--muted))",
                }}
              />
              <p className="mt-1.5 text-center text-[10px] text-muted-foreground">{l}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const SHOWCASES = [
  {
    label: "Predictive Analytics",
    title: "Know Your Grade Before It Happens",
    description:
      "Our regression model analyzes quiz scores, assignment completions, and study patterns to predict your final grade per course. The probability trend chart shows how your trajectory evolves over time — so you can course-correct early, not after the exam.",
    bullets: [
      "Per-course predicted grade (0–100)",
      "Probability trend with historical tracking",
      "Comparison against actual Moodle average",
    ],
    visual: <MockDashboardCard />,
    reversed: false,
  },
  {
    label: "Explainable AI",
    title: "Understand Why, Not Just What",
    description:
      "Unlike black-box models, AcademIQ uses SHAP (SHapley Additive exPlanations) to rank the exact behavioural factors driving your performance status. The counterfactual engine goes further: it shows the minimum changes needed to flip from At Risk to High Performer.",
    bullets: [
      "SHAP-ranked risk factors with impact scores",
      "Counterfactual \"what-if\" recommendations",
      "Evidence timeline with severity-tagged events",
    ],
    visual: <MockRiskFactors />,
    reversed: true,
  },
  {
    label: "Wellbeing Monitoring",
    title: "Catch Burnout Before It Catches You",
    description:
      "AcademIQ aggregates study time across all your enrolled courses to compute a burnout risk level. The four-tier system — Safe, Low Risk, Medium Risk, High Risk — gives you a clear, at-a-glance signal of when to push harder and when to step back.",
    bullets: [
      "Cross-course workload aggregation",
      "Four-level animated risk meter",
      "Proactive alerts before grade impact",
    ],
    visual: <MockBurnoutMeter />,
    reversed: false,
  },
];

export function FeatureShowcase() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section className="py-24" style={{ background: "hsl(var(--background))" }}>
      <div className="container space-y-28">
        {SHOWCASES.map(({ label, title, description, bullets, visual, reversed }, i) => (
          <ShowcaseRow
            key={title}
            label={label}
            title={title}
            description={description}
            bullets={bullets}
            visual={visual}
            reversed={reversed}
            index={i}
            prefersReducedMotion={!!prefersReducedMotion}
          />
        ))}
      </div>
    </section>
  );
}

function ShowcaseRow({
  label,
  title,
  description,
  bullets,
  visual,
  reversed,
  index,
  prefersReducedMotion,
}: {
  label: string;
  title: string;
  description: string;
  bullets: string[];
  visual: React.ReactNode;
  reversed: boolean;
  index: number;
  prefersReducedMotion: boolean;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <div
      ref={ref}
      className={`flex flex-col items-center gap-12 lg:flex-row lg:gap-16 ${reversed ? "lg:flex-row-reverse" : ""}`}
    >
      {/* Text */}
      <motion.div
        className="flex-1"
        initial={prefersReducedMotion ? {} : { opacity: 0, x: reversed ? 30 : -30 }}
        animate={isInView ? { opacity: 1, x: 0 } : {}}
        transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <span
          className="mb-3 inline-block rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider"
          style={{
            borderColor: "var(--brand-steel)",
            color: "var(--brand-steel)",
            background: "color-mix(in srgb, var(--brand-steel) 6%, transparent)",
          }}
        >
          {label}
        </span>
        <h3 className="mb-4 text-2xl font-bold text-foreground md:text-3xl">
          {title}
        </h3>
        <p className="mb-6 leading-relaxed text-muted-foreground">{description}</p>
        <ul className="space-y-3">
          {bullets.map((b) => (
            <li key={b} className="flex items-start gap-3 text-sm">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand-green)]" />
              <span className="text-foreground/80">{b}</span>
            </li>
          ))}
        </ul>
      </motion.div>

      {/* Visual */}
      <motion.div
        className="w-full max-w-md flex-1"
        initial={prefersReducedMotion ? {} : { opacity: 0, x: reversed ? -30 : 30 }}
        animate={isInView ? { opacity: 1, x: 0 } : {}}
        transition={{ duration: 0.7, delay: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        {visual}
      </motion.div>
    </div>
  );
}
