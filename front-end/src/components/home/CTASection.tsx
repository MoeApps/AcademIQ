"use client";

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { motion, useReducedMotion, useInView } from "framer-motion";
import { useRef } from "react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CTASection() {
  const prefersReducedMotion = useReducedMotion();
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section ref={ref} className="py-24" style={{ background: "hsl(var(--background))" }}>
      <div className="container">
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="relative overflow-hidden rounded-3xl px-8 py-16 text-center md:px-16 md:py-20"
          style={{
            background:
              "linear-gradient(135deg, var(--brand-navy-deep) 0%, var(--brand-navy) 40%, var(--brand-steel) 100%)",
          }}
        >
          {/* Decorative elements */}
          <div
            className="pointer-events-none absolute -right-20 -top-20 h-[300px] w-[300px] rounded-full opacity-[0.08]"
            style={{
              background:
                "radial-gradient(circle, var(--brand-steel-light) 0%, transparent 70%)",
            }}
          />
          <div
            className="pointer-events-none absolute -bottom-24 -left-24 h-[350px] w-[350px] rounded-full opacity-[0.06]"
            style={{
              background:
                "radial-gradient(circle, var(--brand-orange) 0%, transparent 70%)",
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

          <div className="relative">
            <motion.div
              initial={prefersReducedMotion ? {} : { opacity: 0, scale: 0.9 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10"
            >
              <Sparkles className="h-7 w-7 text-[var(--brand-steel-light)]" />
            </motion.div>

            <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl lg:text-5xl">
              Ready to Study{" "}
              <span style={{ color: "var(--brand-orange)" }}>Smarter</span>?
            </h2>
            <p className="mx-auto mb-8 max-w-xl text-lg text-white/60">
              Join AcademIQ and let AI-driven insights guide your academic journey.
              Your Moodle data is already there — we just make it work for you.
            </p>

            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/signin"
                className={cn(
                  buttonVariants({ variant: "light", size: "lg" }),
                  "group gap-2 rounded-full px-8 shadow-lg shadow-black/20",
                )}
              >
                Get Started Free
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="#features"
                className="text-sm font-medium text-white/60 transition-colors hover:text-white"
              >
                Learn more about the models &darr;
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
