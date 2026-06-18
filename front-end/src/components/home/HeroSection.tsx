"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, BarChart3, BookOpen, Shield } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PILLS = [
  { icon: BarChart3, label: "Grade Prediction" },
  { icon: BookOpen, label: "AI Quiz Generation" },
  { icon: Shield, label: "Burnout & Risk Detection" },
];

const fadeUp = (delay: number) => ({
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.7,
      delay,
      ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
    },
  },
});

const staggerContainer = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1, delayChildren: 0.5 },
  },
};

const pillVariant = {
  hidden: { opacity: 0, scale: 0.8, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
    },
  },
};

const noMotion = {
  hidden: { opacity: 1, y: 0, scale: 1 },
  visible: { opacity: 1, y: 0, scale: 1 },
};

export function HeroSection() {
  const prefersReducedMotion = useReducedMotion();
  const v = prefersReducedMotion ? noMotion : null;

  return (
    <section className="relative min-h-[650px] w-full overflow-hidden">
      <div className="absolute inset-0">
        <Image
          src="/hero-study.jpg"
          alt="Students studying together"
          fill
          priority
          className="object-cover"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, rgba(18,40,64,0.95) 0%, rgba(27,58,92,0.88) 40%, rgba(46,134,171,0.55) 100%)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      </div>

      {/* Decorative floating shapes */}
      {!prefersReducedMotion && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <motion.div
            className="absolute -right-20 -top-20 h-[400px] w-[400px] rounded-full opacity-[0.07]"
            style={{
              background:
                "radial-gradient(circle, var(--brand-steel) 0%, transparent 70%)",
            }}
            animate={{ scale: [1, 1.15, 1], rotate: [0, 10, 0] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute -bottom-32 -left-32 h-[500px] w-[500px] rounded-full opacity-[0.05]"
            style={{
              background:
                "radial-gradient(circle, var(--brand-orange) 0%, transparent 70%)",
            }}
            animate={{ scale: [1, 1.1, 1], rotate: [0, -8, 0] }}
            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      )}

      <div className="container relative z-10 flex min-h-[650px] flex-col items-center justify-center py-20 text-center">
        <motion.div
          variants={v ?? fadeUp(0)}
          initial="hidden"
          animate="visible"
          className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 backdrop-blur-sm"
        >
          <div className="h-2 w-2 rounded-full bg-[var(--brand-green)]" />
          <span className="text-xs font-medium uppercase tracking-widest text-white/80">
            AI-Powered Student Analytics
          </span>
        </motion.div>

        <motion.h1
          variants={v ?? fadeUp(0.15)}
          initial="hidden"
          animate="visible"
          className="mb-6 max-w-4xl text-4xl font-bold leading-tight text-white md:text-5xl lg:text-6xl"
        >
          Empower Your{" "}
          <span
            className="bg-clip-text text-transparent"
            style={{
              backgroundImage:
                "linear-gradient(135deg, var(--brand-steel-light), var(--brand-orange))",
            }}
          >
            Academic Journey
          </span>
        </motion.h1>

        <motion.p
          variants={v ?? fadeUp(0.3)}
          initial="hidden"
          animate="visible"
          className="mb-10 max-w-2xl text-lg text-white/75 md:text-xl"
        >
          A supplementary learning platform that works alongside your Moodle LMS.
          Monitor your performance, anticipate risk early, and target your study
          effort where it counts.
        </motion.p>

        <motion.div
          variants={prefersReducedMotion ? undefined : staggerContainer}
          initial="hidden"
          animate="visible"
          className="mb-10 flex flex-wrap justify-center gap-3"
        >
          {PILLS.map(({ icon: Icon, label }) => (
            <motion.div
              key={label}
              variants={v ?? pillVariant}
              className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.07] px-4 py-2.5 backdrop-blur-sm transition-colors hover:bg-white/[0.12]"
            >
              <Icon className="h-4 w-4 text-[var(--brand-steel-light)]" />
              <span className="text-sm font-medium text-white/90">{label}</span>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          variants={v ?? fadeUp(0.7)}
          initial="hidden"
          animate="visible"
        >
          <Link
            href="/signin"
            className={cn(
              buttonVariants({ variant: "light", size: "lg" }),
              "group gap-2 rounded-full px-8 shadow-lg shadow-black/20 transition-shadow hover:shadow-xl hover:shadow-black/25",
            )}
          >
            Get Started
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
