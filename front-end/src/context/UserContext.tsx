"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { api } from "@/lib/api";
import type { AuthUser, Role } from "@/lib/types";

const STORAGE_KEY = "academiq.user";

/** Subscribe that never fires — used only to read a server/client-split flag. */
const noopSubscribe = () => () => {};

/**
 * The persisted session lives in localStorage for UX (who's signed in + their
 * role), while the backend owns the real session via an httpOnly cookie. We
 * expose it through useSyncExternalStore so reads are hydration-safe and stay
 * in sync across tabs without a setState-in-effect.
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
  user: AuthUser | null;
  role: Role | null;
  /** False until the first client mount, so guards don't redirect early. */
  isReady: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  signIn: (user: AuthUser) => void;
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

  const user = useMemo<AuthUser | null>(() => {
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  }, [raw]);

  const signIn = useCallback((next: AuthUser) => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    notify();
  }, []);

  const signOut = useCallback(() => {
    // Clear the backend session (best-effort) then the local snapshot.
    void api.signOut();
    window.localStorage.removeItem(STORAGE_KEY);
    notify();
  }, []);

  const value = useMemo<UserContextValue>(
    () => ({
      user,
      role: user?.role ?? null,
      isReady,
      isAuthenticated: user !== null,
      isAdmin: user?.role === "admin",
      signIn,
      signOut,
    }),
    [user, isReady, signIn, signOut],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within a UserProvider");
  return ctx;
}
