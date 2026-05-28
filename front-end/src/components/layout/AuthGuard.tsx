"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useUser } from "@/context/UserContext";

/**
 * Client-side gate for the authenticated area. Because all auth state lives in
 * Moodle (no client accounts), this is a UX guard, not a security boundary —
 * the backend still authorizes every data request.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isReady, isAuthenticated } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isReady && !isAuthenticated) {
      router.replace("/signin");
    }
  }, [isReady, isAuthenticated, router]);

  if (!isReady || !isAuthenticated) {
    return (
      <div className="flex flex-1 items-center justify-center py-32">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <>{children}</>;
}
