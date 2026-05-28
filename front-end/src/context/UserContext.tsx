"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { Student } from "@/lib/types";

const STORAGE_KEY = "academiq.student";

/** Subscribe that never fires — used only to read a server/client-split flag. */
const noopSubscribe = () => () => {};

/**
 * The persisted session lives in localStorage (the backend owns real auth).
 * We expose it through useSyncExternalStore so reads are hydration-safe and
 * stay in sync across tabs without a setState-in-effect.
 */
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function getSnapshot(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function getServerSnapshot(): string | null {
  return null;
}

interface UserContextValue {
  student: Student | null;
  /** False until the first client mount, so guards don't redirect early. */
  isReady: boolean;
  isAuthenticated: boolean;
  signIn: (student: Student) => void;
  signOut: () => void;
}

const UserContext = createContext<UserContextValue | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  // false during SSR and the hydration render, true afterwards — so guards
  // wait for the real client snapshot before redirecting.
  const isReady = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );

  const student = useMemo<Student | null>(() => {
    if (!raw) return null;
    try {
      return JSON.parse(raw) as Student;
    } catch {
      return null;
    }
  }, [raw]);

  const signIn = useCallback((next: Student) => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    notify();
  }, []);

  const signOut = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    notify();
  }, []);

  const value = useMemo<UserContextValue>(
    () => ({
      student,
      isReady,
      isAuthenticated: student !== null,
      signIn,
      signOut,
    }),
    [student, isReady, signIn, signOut],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within a UserProvider");
  return ctx;
}
