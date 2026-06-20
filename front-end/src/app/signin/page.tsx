"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GraduationCap, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import { useUser } from "@/context/UserContext";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoodleLogo } from "@/components/ui/moodle-logo";

const fadeUp = (delay: number) => ({
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      delay,
      ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
    },
  },
});

const noMotion = {
  hidden: { opacity: 1, y: 0 },
  visible: { opacity: 1, y: 0 },
};

type View = "main" | "moodle";

export default function SignInPage() {
  const router = useRouter();
  const { signIn } = useUser();
  const [view, setView] = useState<View>("main");
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [moodleData, setMoodleData] = useState({
    moodleUrl: "",
    username: "",
    password: "",
  });
  const [errors, setErrors] = useState({ email: "", password: "", general: "" });
  const [moodleErrors, setMoodleErrors] = useState({
    moodleUrl: "",
    username: "",
    password: "",
    general: "",
  });
  const [accountCreated, setAccountCreated] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const v = prefersReducedMotion ? noMotion : null;

  useEffect(() => {
    api.getMoodleDefaultUrl().then((url) => {
      if (url) setMoodleData((prev) => ({ ...prev, moodleUrl: url }));
    });
  }, []);

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

  const validateMoodleForm = () => {
    const next = { moodleUrl: "", username: "", password: "", general: "" };
    let valid = true;

    if (!moodleData.moodleUrl.trim()) {
      next.moodleUrl = "Moodle URL is required";
      valid = false;
    } else {
      try {
        new URL(moodleData.moodleUrl.trim());
      } catch {
        next.moodleUrl = "Enter a valid URL (e.g. https://moodle.university.edu)";
        valid = false;
      }
    }

    if (!moodleData.username.trim()) {
      next.username = "Username is required";
      valid = false;
    }

    if (!moodleData.password) {
      next.password = "Password is required";
      valid = false;
    }

    setMoodleErrors(next);
    return valid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    setErrors({ email: "", password: "", general: "" });

    try {
      const { user } = await api.signIn(formData.email, formData.password);
      signIn(user);
      router.push(user.role === "admin" ? "/admin" : "/dashboard");
    } catch {
      setErrors((prev) => ({
        ...prev,
        general: "Invalid email or password. Please try again.",
      }));
      setIsLoading(false);
    }
  };

  const handleMoodleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateMoodleForm()) return;

    setIsLoading(true);
    setMoodleErrors({ moodleUrl: "", username: "", password: "", general: "" });
    setAccountCreated(false);

    try {
      const result = await api.moodleLogin(
        moodleData.moodleUrl.trim(),
        moodleData.username.trim(),
        moodleData.password,
      );
      if (result.account_created) {
        setAccountCreated(true);
      }
      signIn(result.user);
      router.push(result.user.role === "admin" ? "/admin" : "/dashboard");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message.includes("401")
            ? "Invalid Moodle username or password."
            : err.message.includes("502")
              ? "Could not reach the Moodle server. Check the URL and try again."
              : "Something went wrong. Please try again."
          : "Something went wrong. Please try again.";
      setMoodleErrors((prev) => ({ ...prev, general: message }));
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

  const handleMoodleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setMoodleData((prev) => ({ ...prev, [name]: value }));
    if (moodleErrors[name as keyof typeof moodleErrors]) {
      setMoodleErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  return (
    <div
      className="flex min-h-screen items-center justify-center p-4"
      style={{
        background:
          "linear-gradient(135deg, var(--brand-navy-deep) 0%, var(--brand-navy) 50%, var(--brand-steel) 100%)",
      }}
    >
      {/* Decorative background shapes */}
      {!prefersReducedMotion && (
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <motion.div
            className="absolute -right-32 -top-32 h-[500px] w-[500px] rounded-full opacity-[0.08]"
            style={{
              background:
                "radial-gradient(circle, var(--brand-steel) 0%, transparent 70%)",
            }}
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute -bottom-40 -left-40 h-[600px] w-[600px] rounded-full opacity-[0.06]"
            style={{
              background:
                "radial-gradient(circle, var(--brand-orange) 0%, transparent 70%)",
            }}
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      )}

      <div className="relative w-full max-w-md">
        <motion.div
          variants={v ?? fadeUp(0)}
          initial="hidden"
          animate="visible"
          className="overflow-hidden rounded-2xl border border-white/10 bg-white p-8 shadow-2xl shadow-black/30"
        >
          {/* Logo */}
          <motion.div
            variants={v ?? fadeUp(0.05)}
            initial="hidden"
            animate="visible"
            className="mb-6 flex justify-center"
          >
            <Link
              href="/"
              className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
            >
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{
                  background:
                    "linear-gradient(135deg, var(--brand-navy), var(--brand-steel))",
                }}
              >
                <GraduationCap className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold" style={{ color: "var(--brand-nearblack)" }}>
                AcademIQ
              </span>
            </Link>
          </motion.div>

          <AnimatePresence mode="wait">
            {view === "main" ? (
              <motion.div
                key="main"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <motion.div
                  variants={v ?? fadeUp(0.1)}
                  initial="hidden"
                  animate="visible"
                >
                  <h1
                    className="mb-1 text-center text-2xl font-bold"
                    style={{ color: "var(--brand-nearblack)" }}
                  >
                    Welcome back
                  </h1>
                  <p className="mb-6 text-center text-sm" style={{ color: "#6b7280" }}>
                    Sign in to continue to your dashboard.
                  </p>
                </motion.div>

                {/* Moodle SSO Button */}
                <motion.div
                  variants={v ?? fadeUp(0.15)}
                  initial="hidden"
                  animate="visible"
                  className="mb-5"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setView("moodle");
                      setErrors({ email: "", password: "", general: "" });
                    }}
                    className="flex w-full items-center justify-center gap-3 rounded-xl border border-[#F98012]/30 bg-[#F98012]/5 px-4 py-3 text-sm font-semibold transition-all hover:border-[#F98012]/50 hover:bg-[#F98012]/10 hover:shadow-md"
                    style={{ color: "#c5600a" }}
                  >
                    <MoodleLogo className="h-6 w-6" />
                    Sign in with Moodle
                  </button>
                </motion.div>

                {/* Divider */}
                <motion.div
                  variants={v ?? fadeUp(0.2)}
                  initial="hidden"
                  animate="visible"
                  className="relative mb-5"
                >
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-white px-3 uppercase tracking-wider text-gray-400">
                      or continue with email
                    </span>
                  </div>
                </motion.div>

                {/* Email/Password Form */}
                <motion.form
                  variants={v ?? fadeUp(0.25)}
                  initial="hidden"
                  animate="visible"
                  onSubmit={handleSubmit}
                  className="space-y-4"
                >
                  {errors.general && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-center text-sm text-red-600">
                      {errors.general}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-sm font-medium" style={{ color: "var(--brand-nearblack)" }}>
                      Email
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="you@university.edu"
                      className={`bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus-visible:ring-[var(--brand-steel)] ${errors.email ? "border-red-400 focus-visible:ring-red-400" : ""}`}
                      disabled={isLoading}
                      autoComplete="email"
                    />
                    {errors.email && (
                      <p className="text-xs text-red-500">{errors.email}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="text-sm font-medium" style={{ color: "var(--brand-nearblack)" }}>
                        Password
                      </Label>
                      <Link
                        href="/forgot-password"
                        className="text-xs font-medium hover:underline"
                        style={{ color: "var(--brand-steel)" }}
                      >
                        Forgot password?
                      </Link>
                    </div>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Enter your password"
                      className={`bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus-visible:ring-[var(--brand-steel)] ${errors.password ? "border-red-400 focus-visible:ring-red-400" : ""}`}
                      disabled={isLoading}
                      autoComplete="current-password"
                    />
                    {errors.password && (
                      <p className="text-xs text-red-500">{errors.password}</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full rounded-xl font-semibold shadow-md shadow-[var(--brand-steel)]/20"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Signing In...
                      </>
                    ) : (
                      "Sign In"
                    )}
                  </Button>
                </motion.form>

                {/* Footer hint */}
                <motion.p
                  variants={v ?? fadeUp(0.3)}
                  initial="hidden"
                  animate="visible"
                  className="mt-5 text-center text-xs text-gray-400"
                >
                  Use the browser extension to sign in automatically via Moodle.
                </motion.p>
              </motion.div>
            ) : (
              <motion.div
                key="moodle"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
              >
                {/* Back button + heading */}
                <div className="mb-5">
                  <button
                    type="button"
                    onClick={() => {
                      setView("main");
                      setMoodleErrors({ moodleUrl: "", username: "", password: "", general: "" });
                      setIsLoading(false);
                      setAccountCreated(false);
                    }}
                    className="mb-3 flex items-center gap-1 text-sm font-medium text-gray-500 transition-colors hover:text-gray-700"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </button>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F98012]/10">
                      <MoodleLogo className="h-6 w-6" />
                    </div>
                    <div>
                      <h1
                        className="text-xl font-bold"
                        style={{ color: "var(--brand-nearblack)" }}
                      >
                        Sign in with Moodle
                      </h1>
                      <p className="text-xs text-gray-500">
                        Use your Moodle credentials to sign in or create an account.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Moodle Form */}
                <form onSubmit={handleMoodleSubmit} className="space-y-4">
                  {moodleErrors.general && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-center text-sm text-red-600">
                      {moodleErrors.general}
                    </div>
                  )}

                  {accountCreated && (
                    <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
                      <span>
                        Account created and linked to your Moodle profile!
                      </span>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label htmlFor="moodleUrl" className="text-sm font-medium" style={{ color: "var(--brand-nearblack)" }}>
                      Moodle URL
                    </Label>
                    <Input
                      id="moodleUrl"
                      name="moodleUrl"
                      type="url"
                      value={moodleData.moodleUrl}
                      onChange={handleMoodleChange}
                      placeholder="https://moodle.university.edu"
                      className={`bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus-visible:ring-[#F98012] ${moodleErrors.moodleUrl ? "border-red-400 focus-visible:ring-red-400" : ""}`}
                      disabled={isLoading}
                      autoComplete="url"
                    />
                    {moodleErrors.moodleUrl && (
                      <p className="text-xs text-red-500">{moodleErrors.moodleUrl}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="username" className="text-sm font-medium" style={{ color: "var(--brand-nearblack)" }}>
                      Moodle Username
                    </Label>
                    <Input
                      id="username"
                      name="username"
                      type="text"
                      value={moodleData.username}
                      onChange={handleMoodleChange}
                      placeholder="Your Moodle username"
                      className={`bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus-visible:ring-[#F98012] ${moodleErrors.username ? "border-red-400 focus-visible:ring-red-400" : ""}`}
                      disabled={isLoading}
                      autoComplete="username"
                    />
                    {moodleErrors.username && (
                      <p className="text-xs text-red-500">{moodleErrors.username}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="moodlePassword" className="text-sm font-medium" style={{ color: "var(--brand-nearblack)" }}>
                      Moodle Password
                    </Label>
                    <Input
                      id="moodlePassword"
                      name="password"
                      type="password"
                      value={moodleData.password}
                      onChange={handleMoodleChange}
                      placeholder="Your Moodle password"
                      className={`bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus-visible:ring-[#F98012] ${moodleErrors.password ? "border-red-400 focus-visible:ring-red-400" : ""}`}
                      disabled={isLoading}
                      autoComplete="current-password"
                    />
                    {moodleErrors.password && (
                      <p className="text-xs text-red-500">{moodleErrors.password}</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full rounded-xl font-semibold shadow-md"
                    style={{
                      background: "linear-gradient(135deg, #F98012, #e06d00)",
                      color: "white",
                    }}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Connecting to Moodle...
                      </>
                    ) : (
                      <>
                        <MoodleLogo className="h-5 w-5" />
                        Sign In with Moodle
                      </>
                    )}
                  </Button>
                </form>

                <p className="mt-4 text-center text-xs text-gray-400">
                  Your Moodle credentials are sent securely to your Moodle server to verify
                  your identity. AcademIQ does not store your Moodle password.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
