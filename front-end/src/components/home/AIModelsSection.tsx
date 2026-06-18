"use client";

import { motion, useReducedMotion, useInView } from "framer-motion";
import { useRef } from "react";
import {
  TrendingUp,
  Brain,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  Target,
  BarChart3,
  Activity,
} from "lucide-react";

const MODELS = [
  {
    name: "Grade Prediction Model",
    tag: "Regression",
    description:
      "A gradient-boosted regression model trained on Moodle activity features — quiz scores, assignment grades, time-on-task — to predict your final course grade before it happens.",
    highlights: [
      "Predicts numeric grade per course (0–100)",
      "Anchored against your real Moodle average",
      "Retrained on each data sync for accuracy",
    ],
    icon: TrendingUp,
    color: "var(--brand-steel)",
  },
  {
    name: "Performance Classifier",
    tag: "Classification",
    description:
      "A binary classification model (PerformanceModel_v4) that predicts whether you're on track to be a High Performer. Uses SHAP values to surface the exact behavioural factors driving your status.",
    highlights: [
      "High-Performer probability with trend tracking",
      "SHAP-ranked risk factors with recommendations",
      "Counterfactual engine: what to change to flip your status",
    ],
    icon: Target,
    color: "var(--brand-green)",
  },
  {
    name: "Student Clustering Engine",
    tag: "Unsupervised ML",
    description:
      "An unsupervised clustering model that groups students into Good, Average, or At Risk cohorts based on engagement patterns — giving you a clear picture of where you stand relative to peers.",
    highlights: [
      "Three-tier classification: Good / Average / At Risk",
      "Per-course and cross-course analysis",
      "Evidence timeline with severity-tagged events",
    ],
    icon: Brain,
    color: "var(--brand-medblue)",
  },
  {
    name: "Burnout Detection System",
    tag: "Risk Analysis",
    description:
      "Monitors your total study workload across all enrolled courses to detect burnout risk before it hits your grades. Four-level classification with actionable guidance.",
    highlights: [
      "Safe → Low → Medium → High risk levels",
      "Cross-course workload aggregation",
      "Early warning before grade decline",
    ],
    icon: AlertTriangle,
    color: "var(--brand-orange)",
  },
];

const cardVariant = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.15,
      duration: 0.6,
      ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
    },
  }),
};

const noMotion = {
  hidden: { opacity: 1, y: 0 },
  visible: { opacity: 1, y: 0 },
};

export function AIModelsSection() {
  const prefersReducedMotion = useReducedMotion();
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section ref={ref} className="py-24" style={{ background: "hsl(var(--background))" }}>
      <div className="container">
        <motion.div
          className="mb-16 text-center"
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--brand-steel)]/20 bg-[var(--brand-steel)]/5 px-4 py-1.5">
            <Sparkles className="h-4 w-4 text-[var(--brand-steel)]" />
            <span className="text-xs font-semibold uppercase tracking-widest text-[var(--brand-steel)]">
              Powered by Machine Learning
            </span>
          </div>
          <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl lg:text-5xl">
            Four AI Models Working{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage:
                  "linear-gradient(135deg, var(--brand-steel), var(--brand-green))",
              }}
            >
              For You
            </span>
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Each model targets a different dimension of your academic life —
            from predicting grades to detecting burnout — so you get a complete,
            data-driven picture.
          </p>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2">
          {MODELS.map(({ name, tag, description, highlights, icon: Icon, color }, i) => (
            <motion.div
              key={name}
              custom={i}
              variants={prefersReducedMotion ? noMotion : cardVariant}
              initial="hidden"
              animate={isInView ? "visible" : "hidden"}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card p-8 transition-all hover:border-primary/30 hover:shadow-xl hover:-translate-y-1"
            >
              {/* Background accent */}
              <div
                className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-[0.08]"
                style={{ background: color }}
              />

              <div className="relative">
                {/* Header */}
                <div className="mb-4 flex items-start justify-between">
                  <div
                    className="flex h-14 w-14 items-center justify-center rounded-2xl"
                    style={{ background: `color-mix(in srgb, ${color} 12%, transparent)` }}
                  >
                    <Icon className="h-7 w-7" style={{ color }} />
                  </div>
                  <span
                    className="rounded-full px-3 py-1 text-xs font-semibold"
                    style={{
                      background: `color-mix(in srgb, ${color} 10%, transparent)`,
                      color,
                    }}
                  >
                    {tag}
                  </span>
                </div>

                <h3 className="mb-2 text-xl font-bold text-card-foreground">{name}</h3>
                <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
                  {description}
                </p>

                {/* Highlights */}
                <ul className="space-y-2.5">
                  {highlights.map((h) => (
                    <li key={h} className="flex items-start gap-2.5 text-sm">
                      <ArrowRight
                        className="mt-0.5 h-3.5 w-3.5 shrink-0"
                        style={{ color }}
                      />
                      <span className="text-card-foreground/80">{h}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom accent bar */}
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, scaleX: 0 }}
          animate={isInView ? { opacity: 1, scaleX: 1 } : {}}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mx-auto mt-16 flex max-w-2xl items-center gap-4 rounded-xl border border-border bg-card p-5"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-steel)]/10">
            <BarChart3 className="h-5 w-5 text-[var(--brand-steel)]" />
          </div>
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-card-foreground">All models retrain on every sync.</span>{" "}
            Your predictions stay current as your Moodle data evolves throughout the semester.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
