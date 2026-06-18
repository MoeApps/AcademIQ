"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  GraduationCap,
  LogOut,
  LayoutDashboard,
  LineChart,
  FileQuestion,
  Activity,
  Menu,
  X,
} from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useState } from "react";
import { AuthGuard } from "@/components/layout/AuthGuard";
import { useUser } from "@/context/UserContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/performance", label: "Performance", icon: LineChart },
  { href: "/quiz", label: "Quiz Generation", icon: FileQuestion },
  { href: "/system-status", label: "System Status", icon: Activity },
];

const sidebarVariants = {
  hidden: { x: -280, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { type: "spring" as const, stiffness: 300, damping: 30 },
  },
};

const navItemVariants = {
  hidden: { x: -20, opacity: 0 },
  visible: (i: number) => ({
    x: 0,
    opacity: 1,
    transition: { delay: 0.05 * i + 0.15, duration: 0.3, ease: "easeOut" as const },
  }),
};

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useUser();
  const prefersReducedMotion = useReducedMotion();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = () => {
    signOut();
    router.replace("/signin");
  };

  const sidebar = (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2.5 px-6">
        <GraduationCap className="h-7 w-7 text-primary-foreground/90" />
        <span className="text-lg font-bold text-primary-foreground">
          AcademIQ
        </span>
      </div>

      {/* Navigation */}
      <nav className="mt-4 flex flex-1 flex-col gap-1 px-3">
        {NAV.map((item, i) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <motion.div
              key={item.href}
              custom={i}
              variants={prefersReducedMotion ? undefined : navItemVariants}
              initial="hidden"
              animate="visible"
            >
              <Link
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "text-primary-foreground"
                    : "text-primary-foreground/60 hover:text-primary-foreground/90",
                )}
              >
                {active && (
                  <motion.div
                    layoutId="activeNav"
                    className="absolute inset-0 rounded-lg"
                    style={{
                      background:
                        "linear-gradient(135deg, var(--brand-steel), rgba(46, 134, 171, 0.6))",
                      boxShadow: "0 0 12px rgba(46, 134, 171, 0.3)",
                    }}
                    transition={
                      prefersReducedMotion
                        ? { duration: 0 }
                        : { type: "spring", stiffness: 350, damping: 30 }
                    }
                  />
                )}
                <Icon className="relative z-10 h-4.5 w-4.5" />
                <span className="relative z-10">{item.label}</span>
              </Link>
            </motion.div>
          );
        })}
      </nav>

      {/* User / Sign Out */}
      <div className="border-t border-primary-foreground/10 p-4">
        {user && (
          <p className="mb-2 truncate text-xs text-primary-foreground/60">
            {user.fullName}
          </p>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          className="w-full justify-start gap-2 text-primary-foreground/70 hover:bg-primary-foreground/10 hover:text-primary-foreground"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );

  return (
    <AuthGuard>
      <div className="flex min-h-screen">
        {/* Desktop Sidebar */}
        <motion.aside
          variants={prefersReducedMotion ? undefined : sidebarVariants}
          initial="hidden"
          animate="visible"
          className="fixed inset-y-0 left-0 z-40 hidden w-[260px] flex-col md:flex"
          style={{
            background:
              "linear-gradient(180deg, var(--brand-navy) 0%, #142d49 100%)",
          }}
        >
          {sidebar}
        </motion.aside>

        {/* Mobile header + drawer */}
        <div className="fixed inset-x-0 top-0 z-50 flex h-14 items-center gap-3 border-b border-border/40 bg-background/95 px-4 backdrop-blur md:hidden">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="inline-flex items-center justify-center rounded-md p-2 text-foreground"
            aria-label="Toggle navigation"
          >
            {mobileOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
          <GraduationCap className="h-6 w-6 text-primary" />
          <span className="text-base font-bold text-foreground">AcademIQ</span>
        </div>

        <AnimatePresence>
          {mobileOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 bg-black/50 md:hidden"
                onClick={() => setMobileOpen(false)}
              />
              <motion.aside
                initial={{ x: -280 }}
                animate={{ x: 0 }}
                exit={{ x: -280 }}
                transition={
                  prefersReducedMotion
                    ? { duration: 0 }
                    : { type: "spring", stiffness: 300, damping: 30 }
                }
                className="fixed inset-y-0 left-0 z-50 w-[260px] md:hidden"
                style={{
                  background:
                    "linear-gradient(180deg, var(--brand-navy) 0%, #142d49 100%)",
                }}
              >
                {sidebar}
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Main content */}
        <main className="flex-1 bg-background pt-14 md:ml-[260px] md:pt-0">
          <div className="container py-8">{children}</div>
        </main>
      </div>
    </AuthGuard>
  );
}
