"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { GraduationCap, Loader2, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import { useUser } from "@/context/UserContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn } = useUser();

  const token = searchParams.get("token") ?? "";

  const [form, setForm] = useState({ password: "", confirm: "" });
  const [errors, setErrors] = useState({ password: "", confirm: "", general: "" });
  const [isLoading, setIsLoading] = useState(false);

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-auth-start to-auth-end p-4">
        <div className="w-full max-w-md rounded-2xl bg-card p-8 shadow-2xl text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-destructive" />
          <h1 className="mb-2 text-xl font-bold text-primary">Invalid link</h1>
          <p className="mb-6 text-sm text-muted-foreground">
            This reset link is missing its token. Please request a new one.
          </p>
          <Link href="/forgot-password" className="text-sm text-primary hover:underline">
            Request a new link
          </Link>
        </div>
      </div>
    );
  }

  const validate = () => {
    const next = { password: "", confirm: "", general: "" };
    let valid = true;

    if (!form.password) {
      next.password = "Password is required";
      valid = false;
    } else if (form.password.length < 6) {
      next.password = "Password must be at least 6 characters";
      valid = false;
    }

    if (!form.confirm) {
      next.confirm = "Please confirm your password";
      valid = false;
    } else if (form.password !== form.confirm) {
      next.confirm = "Passwords do not match";
      valid = false;
    }

    setErrors(next);
    return valid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setErrors({ password: "", confirm: "", general: "" });

    try {
      const { user } = await api.resetPassword(token, form.password);
      signIn(user);
      router.push(user.role === "admin" ? "/admin" : "/dashboard");
    } catch {
      setErrors((prev) => ({
        ...prev,
        general:
          "This reset link is invalid or has expired. Please request a new one.",
      }));
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
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

          <h1 className="mb-2 text-center text-2xl font-bold text-primary">
            Set a new password
          </h1>
          <p className="mb-8 text-center text-sm text-muted-foreground">
            Choose a strong password. You will be signed in automatically.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {errors.general && (
              <div className="rounded-lg bg-destructive/10 p-3 text-center text-sm text-destructive">
                {errors.general}{" "}
                <Link href="/forgot-password" className="underline font-medium">
                  Request a new link
                </Link>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                placeholder="At least 6 characters"
                className={errors.password ? "border-destructive focus-visible:ring-destructive" : ""}
                disabled={isLoading}
                autoComplete="new-password"
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm new password</Label>
              <Input
                id="confirm"
                name="confirm"
                type="password"
                value={form.confirm}
                onChange={handleChange}
                placeholder="Repeat your password"
                className={errors.confirm ? "border-destructive focus-visible:ring-destructive" : ""}
                disabled={isLoading}
                autoComplete="new-password"
              />
              {errors.confirm && (
                <p className="text-sm text-destructive">{errors.confirm}</p>
              )}
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Set new password"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}