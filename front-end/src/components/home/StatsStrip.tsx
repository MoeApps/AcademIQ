"use client";

import { motion, useReducedMotion, useInView } from "framer-motion";
import { useRef } from "react";
import { Brain, Cpu, Zap, BarChart3 } from "lucide-react";

const STATS = [
  { value: "4", label: "AI Models", icon: Brain },
  { value: "93%", label: "Prediction Accuracy", icon: Zap },
  { value: "Real-time", label: "Analytics", icon: BarChart3 },
  { value: "100%", label: "Moodle Integrated", icon: Cpu },
];

export function StatsStrip() {
  const prefersReducedMotion = useReducedMotion();
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });

  return (
    <section
      ref={ref}
      className="relative overflow-hidden border-y border-white/10 py-16"
      style={{
        background:
          "linear-gradient(135deg, var(--brand-navy-deep) 0%, var(--brand-navy) 100%)",
      }}
    >
      <div className="pointer-events-none absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 50%, white 1px, transparent 1px)",
        backgroundSize: "40px 40px",
      }} />

      <div className="container">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {STATS.map(({ value, label, icon: Icon }, i) => (
            <motion.div
              key={label}
              initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="text-center"
            >
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white/[0.08]">
                <Icon className="h-6 w-6 text-[var(--brand-steel-light)]" />
              </div>
              <p className="text-3xl font-bold text-white md:text-4xl">{value}</p>
              <p className="mt-1 text-sm text-white/50">{label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
