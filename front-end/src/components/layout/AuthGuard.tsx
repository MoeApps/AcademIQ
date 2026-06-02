"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useUser } from "@/context/UserContext";
import type { Role } from "@/lib/types";

/**
 * Client-side gate for authenticated areas. Because the backend owns the real
 * session (httpOnly cookie) and authorizes every data request, this is a UX
 * guard, not a security boundary.
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
  const { isReady, isAuthenticated, role } = useUser();
  const router = useRouter();

  const roleOk = !requiredRole || role === requiredRole;

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) {
      router.replace("/signin");
    } else if (!roleOk) {
      // Authenticated but not allowed here — send to their own landing page.
      router.replace(role === "admin" ? "/admin" : "/dashboard");
    }
  }, [isReady, isAuthenticated, roleOk, role, router]);

  if (!isReady || !isAuthenticated || !roleOk) {
    return (
      <div className="flex flex-1 items-center justify-center py-32">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <>{children}</>;
}
