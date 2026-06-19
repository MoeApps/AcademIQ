"use client";

import { useEffect, useState } from "react";
import { Users, Mail } from "lucide-react";

import { api } from "@/lib/api";
import { useUser } from "@/context/UserContext";
import type { StudyBuddy } from "@/lib/types";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function StudyBuddies({ courseId }: { courseId: string }) {
  const { user } = useUser();
  const [buddies, setBuddies] = useState<StudyBuddy[] | null>(null);
  const [available, setAvailable] = useState(true);
  const [reason, setReason] = useState<string | null>(null);
  const [optin, setOptin] = useState<boolean>(Boolean(user?.studyBuddyOptIn));
  const [saving, setSaving] = useState(false);

  // Read the authoritative opt-in state from the backend (localStorage may be stale).
  useEffect(() => {
    let active = true;
    api.getMe().then((me) => {
      if (active && me) setOptin(Boolean(me.studyBuddyOptIn));
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!courseId) return;
    let active = true;
    setBuddies(null);

    api
      .getStudyBuddies(courseId)
      .then((res) => {
        if (!active) return;
        setAvailable(res.available);
        setBuddies(res.buddies);
        setReason(res.reason ?? null);
      })
      .catch(() => {
        if (!active) return;
        setBuddies([]);
        setReason("Could not load study buddies.");
      });

    return () => {
      active = false;
    };
  }, [courseId]);

  const toggleOptin = async () => {
    setSaving(true);
    try {
      const res = await api.setStudyBuddyOptIn(!optin);
      setOptin(res.studyBuddyOptIn);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-6">
      <div className="flex items-center gap-3">
        <div
          className="flex h-11 w-11 items-center justify-center rounded-xl"
          style={{ background: "color-mix(in srgb, var(--brand-steel) 12%, transparent)" }}
        >
          <Users className="h-5 w-5 text-[var(--brand-steel)]" />
        </div>
        <div>
          <h2 className="font-semibold text-foreground">Study Buddies</h2>
          <p className="text-sm text-muted-foreground">
            Classmates with a study style like yours
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {buddies === null ? (
          [0, 1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-muted/40" />
          ))
        ) : !available ? (
          <p className="text-sm text-muted-foreground">
            {reason ?? "Sync the extension to get study-buddy suggestions."}
          </p>
        ) : buddies.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {reason ?? "No matches yet — opted-in classmates will show up here."}
          </p>
        ) : (
          buddies.map((b) => (
            <div
              key={b.studentId}
              className="flex items-center gap-3 rounded-xl border border-border/50 bg-background/40 p-3"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--brand-steel)]/15 text-xs font-semibold text-[var(--brand-steel)]">
                {initials(b.fullName)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{b.fullName}</p>
                <p className="truncate text-xs text-muted-foreground">{b.email}</p>
                <span className="mt-1 inline-block rounded-full bg-[var(--brand-steel)]/10 px-2 py-0.5 text-xs text-[var(--brand-steel)]">
                  {b.why}
                </span>
              </div>
              <a
                href={`mailto:${b.email}`}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border/60 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-[var(--brand-steel)]/40 hover:text-[var(--brand-steel)]"
                title={`Email ${b.fullName}`}
              >
                <Mail className="h-3.5 w-3.5" />
                Contact
              </a>
            </div>
          ))
        )}
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-border/50 pt-4">
        <span className="text-sm text-muted-foreground">
          Let classmates find me as a study buddy
        </span>
        <button
          type="button"
          onClick={toggleOptin}
          disabled={saving}
          role="switch"
          aria-checked={optin}
          aria-label="Be discoverable as a study buddy"
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
            optin ? "bg-[var(--brand-steel)]" : "bg-muted"
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
              optin ? "translate-x-[22px]" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>
    </div>
  );
}
