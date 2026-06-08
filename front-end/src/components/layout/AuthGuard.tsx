"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { getAccessToken, getStoredRole } from "@/lib/api";
import type { Role } from "@/lib/types";

const noopSubscribe = () => () => {};

function subscribeAuth(listener: () => void) {
  window.addEventListener("storage", listener);
  return () => window.removeEventListener("storage", listener);
}

/**
 * Client-side gate for authenticated areas.
 *
 * Pass `requiredRole` to restrict an area to a single role:
 *   - unauthenticated users → /signin
 *   - wrong role (e.g. a student hitting /admin) → their own home
 */
export function AuthGuard({
  children,
  requiredRole,
}: {
  children: React.ReactNode;
  requiredRole?: Role;
}) {
  const router = useRouter();

  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const accessToken = useSyncExternalStore(
    subscribeAuth,
    getAccessToken,
    () => null,
  );
  const role = useSyncExternalStore(subscribeAuth, getStoredRole, () => null);

  const authed = Boolean(accessToken);
  const roleOk =
    !requiredRole || role === requiredRole;

  useEffect(() => {
    if (!mounted) return;
    if (!authed) {
      router.replace("/signin");
    } else if (!roleOk) {
      router.replace(role === "admin" ? "/admin" : "/dashboard");
    }
  }, [mounted, authed, roleOk, role, router]);

  if (!mounted || !authed || !roleOk) {
    return (
      <div className="flex flex-1 items-center justify-center py-32">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <>{children}</>;
}
