"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { GraduationCap, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { api } from "@/lib/api";
import { useUser } from "@/context/UserContext";

type State = "loading" | "success" | "error";

export default function MagicLoginPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { signIn }   = useUser();

  const token = searchParams.get("token") ?? "";
  const [state, setState]   = useState<State>("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setState("error");
      setMessage("No login token found in the URL. Please sync again from the extension.");
      return;
    }

    let cancelled = false;

    api
      .magicLogin(token)
      .then(({ user }) => {
        if (cancelled) return;
        signIn(user);
        setState("success");
        // Brief success flash before redirect so the user sees confirmation.
        setTimeout(() => {
          router.push(user.role === "admin" ? "/admin" : "/dashboard");
        }, 800);
      })
      .catch(() => {
        if (cancelled) return;
        setState("error");
        setMessage(
          "This login link has expired or already been used. Links are valid for 60 seconds — please sync again from the extension."
        );
      });

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-auth-start to-auth-end p-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl bg-card p-8 shadow-2xl">

          {/* Brand */}
          <div className="mb-8 flex justify-center">
            <Link
              href="/"
              className="flex items-center gap-2 transition-opacity hover:opacity-80"
            >
              <GraduationCap className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold text-foreground">AcademIQ</span>
            </Link>
          </div>

          {/* Loading */}
          {state === "loading" && (
            <div className="flex flex-col items-center gap-4 text-center">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <h1 className="text-xl font-bold text-primary">Signing you in…</h1>
              <p className="text-sm text-muted-foreground">
                Verifying your link. This takes less than a second.
              </p>
            </div>
          )}

          {/* Success */}
          {state === "success" && (
            <div className="flex flex-col items-center gap-4 text-center">
              <CheckCircle className="h-10 w-10 text-green-500" />
              <h1 className="text-xl font-bold text-primary">You&rsquo;re in!</h1>
              <p className="text-sm text-muted-foreground">
                Redirecting to your dashboard…
              </p>
            </div>
          )}

          {/* Error */}
          {state === "error" && (
            <div className="flex flex-col items-center gap-4 text-center">
              <AlertCircle className="h-10 w-10 text-destructive" />
              <h1 className="text-xl font-bold text-primary">Link expired</h1>
              <p className="text-sm text-muted-foreground">{message}</p>
              <div className="flex flex-col gap-2 w-full mt-2">
                <Link
                  href="/signin"
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground text-center hover:opacity-90 transition-opacity"
                >
                  Sign in manually
                </Link>
                <Link
                  href="/"
                  className="text-sm text-primary hover:underline text-center"
                >
                  Back to home
                </Link>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
