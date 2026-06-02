"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GraduationCap, Loader2 } from "lucide-react";
import { useUser } from "@/context/UserContext";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignInPage() {
  const router = useRouter();
  const { signIn } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({
    email: "",
    password: "",
    general: "",
  });

  const validateForm = () => {
    const next = { email: "", password: "", general: "" };
    let valid = true;

    if (!formData.email.trim()) {
      next.email = "Email is required";
      valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      next.email = "Enter a valid email address";
      valid = false;
    }

    if (!formData.password) {
      next.password = "Password is required";
      valid = false;
    } else if (formData.password.length < 6) {
      next.password = "Password must be at least 6 characters";
      valid = false;
    }

    setErrors(next);
    return valid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    setErrors({ email: "", password: "", general: "" });

    try {
      // Credentials are validated by the backend against AcademIQ accounts.
      const { user } = await api.signIn(formData.email, formData.password);
      signIn(user);
      // Role-based redirect: admins manage users, students see their dashboard.
      router.push(user.role === "admin" ? "/admin" : "/dashboard");
    } catch {
      setErrors((prev) => ({
        ...prev,
        general: "Invalid email or password. Please try again.",
      }));
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
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
            Sign In
          </h1>
          <p className="mb-8 text-center text-sm text-muted-foreground">
            Sign in with your AcademIQ email and password.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {errors.general && (
              <div className="rounded-lg bg-destructive/10 p-3 text-center text-sm text-destructive">
                {errors.general}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="you@university.edu"
                className={errors.email ? "border-destructive focus-visible:ring-destructive" : ""}
                disabled={isLoading}
                autoComplete="email"
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                className={errors.password ? "border-destructive focus-visible:ring-destructive" : ""}
                disabled={isLoading}
                autoComplete="current-password"
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password}</p>
              )}
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing In...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
