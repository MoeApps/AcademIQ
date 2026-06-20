"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { Users, UserCheck, Info } from "lucide-react";
import { motion, useReducedMotion, useInView } from "framer-motion";

import { api } from "@/lib/api";
import type { Course, StudyBuddyResponse } from "@/lib/types";
import { useUser } from "@/context/UserContext";
import { CourseSelect } from "@/components/common/CourseSelect";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

function Section({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const prefersReducedMotion = useReducedMotion();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <motion.div
      ref={ref}
      initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={
        prefersReducedMotion
          ? { duration: 0 }
          : { duration: 0.6, delay, ease: [0.25, 1, 0.5, 1] as [number, number, number, number] }
      }
      className={className}
    >
      {children}
    </motion.div>
  );
}

function ShimmerBlock({ className }: { className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-border/40 bg-muted/30 ${className ?? ""}`}
    >
      <div
        className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite]"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, color-mix(in srgb, var(--brand-steel) 6%, transparent) 50%, transparent 100%)",
        }}
      />
    </div>
  );
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (name[0] ?? "?").toUpperCase();
}

function StudyBuddiesContent() {
  const { user, signIn } = useUser();
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [coursesError, setCoursesError] = useState("");
  const [buddyData, setBuddyData] = useState<StudyBuddyResponse | null>(null);
  const [buddiesLoading, setBuddiesLoading] = useState(false);
  const [optIn, setOptIn] = useState(user?.studyBuddyOptIn ?? false);
  const [optInLoading, setOptInLoading] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    api.getCourses()
      .then((list) => {
        setCourses(list);
        if (list[0]?.id) setSelectedId(list[0].id);
      })
      .catch(() => setCoursesError("Could not load courses."))
      .finally(() => setCoursesLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    let active = true;
    setBuddiesLoading(true);
    setBuddyData(null);

    api.getStudyBuddies(selectedId)
      .then((data) => {
        if (active) setBuddyData(data);
      })
      .finally(() => {
        if (active) setBuddiesLoading(false);
      });

    return () => { active = false; };
  }, [selectedId]);

  const handleOptInToggle = async () => {
    const next = !optIn;
    setOptInLoading(true);
    try {
      const result = await api.setStudyBuddyOptIn(next);
      setOptIn(result.studyBuddyOptIn);
      if (user) {
        signIn({ ...user, studyBuddyOptIn: result.studyBuddyOptIn });
      }
    } finally {
      setOptInLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Hero Strip */}
      <motion.div
        initial={prefersReducedMotion ? {} : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={
          prefersReducedMotion
            ? { duration: 0 }
            : { duration: 0.7, ease: [0.25, 1, 0.5, 1] as [number, number, number, number] }
        }
        className="group relative overflow-hidden rounded-2xl px-6 py-8 sm:px-8 sm:py-10"
        style={{
          background:
            "linear-gradient(135deg, var(--brand-navy) 0%, var(--brand-navy-deep) 40%, var(--brand-medblue) 100%)",
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 80% 20%, white 0%, transparent 60%)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        <div
          className="pointer-events-none absolute -right-20 -bottom-20 h-60 w-60 rounded-full opacity-0 blur-3xl transition-opacity duration-700 group-hover:opacity-20"
          style={{ background: "var(--brand-steel)" }}
        />

        <div className="relative flex items-center gap-4">
          <motion.div
            initial={prefersReducedMotion ? {} : { scale: 0, rotate: -15 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : { type: "spring" as const, stiffness: 260, damping: 20, delay: 0.2 }
            }
            className="flex h-13 w-13 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm shadow-lg shadow-black/10"
          >
            <Users className="h-6 w-6 text-white" />
          </motion.div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Study Buddies
            </h1>
            <p className="mt-1 text-sm text-white/50 sm:text-base">
              Classmates with a study style like yours.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Course Selector */}
      <Section delay={0.05}>
        {coursesLoading ? (
          <ShimmerBlock className="h-16 w-full max-w-sm" />
        ) : coursesError ? (
          <div className="rounded-2xl border border-border/60 bg-card p-6">
            <h2 className="font-semibold text-foreground">Could not load courses</h2>
            <p className="text-sm text-muted-foreground">{coursesError}</p>
          </div>
        ) : courses.length > 1 ? (
          <CourseSelect courses={courses} value={selectedId} onChange={setSelectedId} />
        ) : courses.length === 1 ? (
          <p className="text-sm font-medium text-muted-foreground">
            {courses[0].code} — {courses[0].name}
          </p>
        ) : (
          <div className="rounded-2xl border border-border/60 bg-card p-6">
            <h2 className="font-semibold text-foreground">No courses found</h2>
            <p className="text-sm text-muted-foreground">
              Open Moodle, run Scan/Sync from the extension, then refresh this page.
            </p>
          </div>
        )}
      </Section>

      {/* Opt-out note */}
      {!optIn && !buddiesLoading && buddyData?.available && (
        <Section delay={0.08}>
          <div
            className="flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm text-muted-foreground"
            style={{
              borderColor: "color-mix(in srgb, var(--brand-steel) 20%, transparent)",
              background: "color-mix(in srgb, var(--brand-steel) 4%, transparent)",
            }}
          >
            <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--brand-steel)]" />
            <span>
              Turn on discovery below to appear in your classmates&apos; suggestions too.
            </span>
          </div>
        </Section>
      )}

      {/* Buddy List */}
      <Section delay={0.1}>
        {buddiesLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="flex items-center gap-4 p-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-5 w-48" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : buddyData && !buddyData.available ? (
          <Card>
            <CardContent className="p-6 text-center">
              <Users className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
              <p className="font-medium text-foreground">Not available yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Sync the extension to get study-buddy suggestions.
              </p>
            </CardContent>
          </Card>
        ) : buddyData && buddyData.buddies.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <UserCheck className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
              <p className="font-medium text-foreground">No matches yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Opted-in classmates will show up here.
              </p>
            </CardContent>
          </Card>
        ) : buddyData ? (
          <div className="space-y-3">
            {buddyData.buddies.slice(0, 5).map((buddy) => (
              <Card key={buddy.studentId}>
                <CardContent className="flex items-center gap-4 p-4">
                  <div
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                    style={{ background: "linear-gradient(135deg, var(--brand-navy), var(--brand-steel))" }}
                  >
                    {getInitials(buddy.fullName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground">{buddy.fullName}</p>
                    <Badge
                      className="mt-1"
                      style={{
                        background: "color-mix(in srgb, var(--brand-steel) 12%, transparent)",
                        color: "var(--brand-steel)",
                        borderColor: "transparent",
                      }}
                    >
                      {buddy.why}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : null}
      </Section>

      {/* Opt-in Switch */}
      <Section delay={0.15}>
        <Card>
          <CardContent className="flex items-center justify-between gap-4 p-4">
            <div className="flex items-center gap-3">
              <UserCheck className="h-5 w-5 text-[var(--brand-steel)]" />
              <span className="text-sm font-medium text-foreground">
                Let classmates find me as a study buddy
              </span>
            </div>
            <button
              role="switch"
              aria-checked={optIn}
              disabled={optInLoading}
              onClick={handleOptInToggle}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                optIn ? "bg-[var(--brand-steel)]" : "bg-muted"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ${
                  optIn ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </CardContent>
        </Card>
      </Section>
    </div>
  );
}

export default function StudyBuddiesPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <ShimmerBlock className="h-32" />
          <ShimmerBlock className="h-16 w-64" />
          <div className="space-y-4">
            <ShimmerBlock className="h-20" />
            <ShimmerBlock className="h-20" />
            <ShimmerBlock className="h-20" />
            <ShimmerBlock className="h-20" />
          </div>
        </div>
      }
    >
      <StudyBuddiesContent />
    </Suspense>
  );
}
