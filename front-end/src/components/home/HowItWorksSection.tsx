"use client";

import { motion, useReducedMotion, useInView } from "framer-motion";
import { useRef } from "react";
import { Download, Cpu, BarChart3, Lightbulb } from "lucide-react";

const STEPS = [
  {
    step: "01",
    title: "Connect Your Moodle",
    description:
      "Install the AcademIQ browser extension. It securely syncs your grades, quiz scores, assignment data, and study time from Moodle — no manual entry needed.",
    icon: Download,
    color: "var(--brand-steel)",
  },
  {
    step: "02",
    title: "AI Analyzes Your Data",
    description:
      "Four machine learning models process your activity: predicting grades, classifying performance, detecting burnout risk, and ranking the factors that matter most.",
    icon: Cpu,
    color: "var(--brand-green)",
  },
  {
    step: "03",
    title: "See Your Dashboard",
    description:
      "A real-time analytics dashboard shows your predicted grades, performance trends, risk factors, and burnout status — all updated every time you sync.",
    icon: BarChart3,
    color: "var(--brand-medblue)",
  },
  {
    step: "04",
    title: "Act on Insights",
    description:
      "Get SHAP-ranked recommendations for improvement, counterfactual analysis showing what to change, and AI-generated quizzes from your own lecture materials.",
    icon: Lightbulb,
    color: "var(--brand-orange)",
  },
];

export function HowItWorksSection() {
  const prefersReducedMotion = useReducedMotion();
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section
      ref={ref}
      className="relative overflow-hidden py-24"
      style={{
        background:
          "linear-gradient(180deg, var(--brand-navy-deep) 0%, var(--brand-navy) 100%)",
      }}
    >
      {/* Dot pattern overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "radial-gradient(circle, white 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      <div className="container relative">
        <motion.div
          className="mb-16 text-center"
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-[var(--brand-steel-light)]">
            How It Works
          </p>
          <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl lg:text-5xl">
            From Moodle to Insights in{" "}
            <span style={{ color: "var(--brand-orange)" }}>Minutes</span>
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-white/60">
            No manual data entry. No complicated setup. Just install the extension,
            sync, and let the AI do the work.
          </p>
        </motion.div>

        <div className="relative grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* Connecting line (desktop) */}
          <div className="pointer-events-none absolute left-0 right-0 top-[52px] hidden h-px bg-gradient-to-r from-transparent via-white/10 to-transparent lg:block" />

          {STEPS.map(({ step, title, description, icon: Icon, color }, i) => (
            <motion.div
              key={step}
              initial={prefersReducedMotion ? {} : { opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: i * 0.15 }}
              className="group relative text-center"
            >
              {/* Step circle */}
              <div className="relative mx-auto mb-6 flex h-[104px] w-[104px] items-center justify-center">
                <div
                  className="absolute inset-0 rounded-full opacity-20 blur-xl transition-opacity group-hover:opacity-40"
                  style={{ background: color }}
                />
                <div
                  className="relative flex h-20 w-20 items-center justify-center rounded-full border-2 transition-colors"
                  style={{ borderColor: `color-mix(in srgb, ${color} 40%, transparent)`, background: `color-mix(in srgb, ${color} 8%, transparent)` }}
                >
                  <Icon className="h-8 w-8" style={{ color }} />
                </div>
                <span
                  className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ background: color }}
                >
                  {step}
                </span>
              </div>

              <h3 className="mb-2 text-lg font-bold text-white">{title}</h3>
              <p className="text-sm leading-relaxed text-white/50">{description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
