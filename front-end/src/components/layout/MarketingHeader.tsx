"use client";

import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { buttonVariants } from "@/components/ui/button";

export function MarketingHeader() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.header
      initial={prefersReducedMotion ? {} : { y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="sticky top-0 z-50 w-full border-b border-white/10 backdrop-blur-xl"
      style={{
        background: "rgba(18, 40, 64, 0.8)",
      }}
    >
      <div className="container flex h-16 items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 transition-opacity hover:opacity-80"
        >
          <GraduationCap className="h-7 w-7 text-[var(--brand-steel-light)]" />
          <span className="text-lg font-bold text-white">AcademIQ</span>
        </Link>

        <nav>
          <Link
            href="/signin"
            className={buttonVariants({ size: "sm" })}
          >
            Sign In
          </Link>
        </nav>
      </div>
    </motion.header>
  );
}
