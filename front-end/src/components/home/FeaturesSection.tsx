"use client";

import {
  AlertTriangle,
  Brain,
  FileQuestion,
  TrendingUp,
} from "lucide-react";
import { motion, useReducedMotion, useInView } from "framer-motion";
import { useRef } from "react";

const FEATURES = [
  {
    icon: TrendingUp,
    title: "Grade Prediction",
    description:
      "See a predicted numeric grade per course, anchored against your actual Moodle average so you know where you stand.",
    color: "var(--brand-steel)",
  },
  {
    icon: Brain,
    title: "Performance Insights",
    description:
      "A clustering model classifies each course as Good, Average, or At Risk, with the ranked factors driving the result.",
    color: "var(--brand-medblue)",
  },
  {
    icon: AlertTriangle,
    title: "Burnout Detection",
    description:
      "Your overall study workload is monitored across all courses to flag burnout risk before it affects your grades.",
    color: "var(--brand-orange)",
  },
  {
    icon: FileQuestion,
    title: "AI Quiz Generation",
    description:
      "Generate practice quizzes built straight from your own lecture materials to revise exactly what you were taught.",
    color: "var(--brand-green)",
  },
];

const cardVariant = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.12,
      duration: 0.6,
      ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
    },
  }),
};

const noMotion = {
  hidden: { opacity: 1, y: 0 },
  visible: { opacity: 1, y: 0 },
};

export function FeaturesSection() {
  const prefersReducedMotion = useReducedMotion();
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="features" className="py-24" ref={ref}>
      <div className="container">
        <motion.div
          className="mb-14 text-center"
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <p
            className="mb-3 text-sm font-semibold uppercase tracking-widest"
            style={{ color: "var(--brand-steel)" }}
          >
            Features
          </p>
          <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">
            Why Choose AcademIQ?
          </h2>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            AcademIQ turns the data already in your Moodle LMS into clear,
            actionable insights — so you can study smarter, not just harder.
          </p>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, description, color }, i) => (
            <motion.div
              key={title}
              custom={i}
              variants={prefersReducedMotion ? noMotion : cardVariant}
              initial="hidden"
              animate={isInView ? "visible" : "hidden"}
              className="group relative overflow-hidden rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/40 hover:shadow-lg hover:-translate-y-0.5"
            >
              {/* Subtle gradient glow on hover */}
              <div
                className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full opacity-0 blur-2xl transition-opacity group-hover:opacity-20"
                style={{ background: color }}
              />

              <div
                className="relative mb-4 flex h-12 w-12 items-center justify-center rounded-xl"
                style={{ background: `color-mix(in srgb, ${color} 12%, transparent)` }}
              >
                <Icon className="h-6 w-6" style={{ color }} />
              </div>
              <h3 className="relative mb-2 font-semibold text-card-foreground">
                {title}
              </h3>
              <p className="relative text-sm leading-relaxed text-muted-foreground">
                {description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
