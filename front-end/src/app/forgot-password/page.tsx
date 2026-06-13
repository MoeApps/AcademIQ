"use client";

import { useState } from "react";
import Link from "next/link";
import { GraduationCap, Loader2, ArrowLeft, CheckCircle } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const validate = () => {
    if (!email.trim()) {
      setEmailError("Email is required");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEmailError("Enter a valid email address");
      return false;
    }
    setEmailError("");
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    try {
      await api.forgotPassword(email.trim());
    } catch {
      // Intentionally swallow errors — we never reveal whether an email exists.
    } finally {
      setIsLoading(false);
      setSubmitted(true);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-auth-start to-auth-end p-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl bg-card p-8 shadow-2xl">
          <div className="mb-8 flex justify-center">
            <Link
              href="/"
              className="flex items-center gap-2 transition-opacity hover:opacity-80"
            >
              <GraduationCap className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold text-foreground">AcademIQ</span>
            </Link>
          </div>

          {submitted ? (
            <div className="text-center">
              <CheckCircle className="mx-auto mb-4 h-12 w-12 text-green-500" />
              <h1 className="mb-2 text-2xl font-bold text-primary">Check your email</h1>
              <p className="mb-6 text-sm text-muted-foreground">
                If <span className="font-medium text-foreground">{email}</span> is
                registered, you will receive a reset link within a few minutes.
                The link expires in 15 minutes.
              </p>
              <p className="mb-6 text-xs text-muted-foreground">
                Did not receive it? Check your spam folder or{" "}
                <button
                  onClick={() => setSubmitted(false)}
                  className="text-primary underline"
                >
                  try again
                </button>
                .
              </p>
              <Link
                href="/signin"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <h1 className="mb-2 text-center text-2xl font-bold text-primary">
                Forgot your password?
              </h1>
              <p className="mb-8 text-center text-sm text-muted-foreground">
                Enter your email and we will send you a secure link to reset it.
              </p>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailError) setEmailError("");
                    }}
                    placeholder="you@university.edu"
                    className={
                      emailError
                        ? "border-destructive focus-visible:ring-destructive"
                        : ""
                    }
                    disabled={isLoading}
                    autoComplete="email"
                  />
                  {emailError && (
                    <p className="text-sm text-destructive">{emailError}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending link...
                    </>
                  ) : (
                    "Send reset link"
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <Link
                  href="/signin"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to sign in
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}