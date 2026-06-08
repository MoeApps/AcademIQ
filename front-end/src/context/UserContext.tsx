"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { api, clearAuthStorage } from "@/lib/api";
import type { AuthUser, Role } from "@/lib/types";

const STORAGE_KEY = "academiq.user";

/** Subscribe that never fires — used only to read a server/client-split flag. */
const noopSubscribe = () => () => {};

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
  /** False until client mount + backend session check complete. */
  isReady: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  signIn: (user: AuthUser) => void;
  signOut: () => void;
}

const UserContext = createContext<UserContextValue | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [sessionChecked, setSessionChecked] = useState(false);

  const mounted = useSyncExternalStore(
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

  // Validate persisted login against the backend (Bearer token or cookie).
  useEffect(() => {
    if (!mounted) return;

    let cancelled = false;
    (async () => {
      const hasLocalUser = Boolean(getSnapshot());
      const hasToken = Boolean(
        typeof window !== "undefined" &&
          window.localStorage.getItem("academiq.token"),
      );

      if (!hasLocalUser && !hasToken) {
        if (!cancelled) setSessionChecked(true);
        return;
      }

      const me = await api.getMe();
      if (cancelled) return;

      if (me) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(me));
        notify();
      } else {
        clearAuthStorage();
        notify();
      }
      setSessionChecked(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [mounted]);

  const signIn = useCallback((next: AuthUser) => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setSessionChecked(true);
    notify();
  }, []);

  const signOut = useCallback(() => {
    void api.signOut();
    clearAuthStorage();
    setSessionChecked(true);
    notify();
  }, []);

  const isReady = mounted && sessionChecked;

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
