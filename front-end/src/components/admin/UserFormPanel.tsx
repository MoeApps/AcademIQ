"use client";

import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { AuthUser, Role, UserInput } from "@/lib/types";

interface Props {
  /** When editing, the existing user; omit for create. */
  user?: AuthUser;
  busy?: boolean;
  onSubmit: (input: UserInput) => void;
  onCancel: () => void;
}

/** Inline create/edit form. Kept as a panel (not a modal) to stay simple. */
export function UserFormPanel({ user, busy, onSubmit, onCancel }: Props) {
  const isEdit = Boolean(user);
  const [form, setForm] = useState({
    fullName: user?.fullName ?? "",
    email: user?.email ?? "",
    role: (user?.role ?? "student") as Role,
    moodleUserId: user?.moodleUserId ?? "",
    studentId: user?.studentId ?? "",
    password: "",
  });
  const [error, setError] = useState("");

  const set = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName.trim()) return setError("Full name is required");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      return setError("Enter a valid email address");
    setError("");

    const input: UserInput = {
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      role: form.role,
      moodleUserId: form.moodleUserId.trim() || null,
      studentId: form.studentId.trim() || null,
    };
    // Only send a password on create when the admin typed one; otherwise the
    // backend generates a secure one and emails it.
    if (!isEdit && form.password.trim()) input.password = form.password.trim();
    onSubmit(input);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{isEdit ? "Edit user" : "Create user"}</CardTitle>
          <button
            type="button"
            onClick={onCancel}
            className="text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full name</Label>
              <Input
                id="fullName"
                value={form.fullName}
                onChange={(e) => set("fullName", e.target.value)}
                disabled={busy}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                disabled={busy}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                id="role"
                value={form.role}
                onChange={(e) => set("role", e.target.value)}
                disabled={busy}
              >
                <option value="student">Student</option>
                <option value="admin">Admin</option>
              </Select>
            </div>
            {!isEdit && (
              <div className="space-y-2">
                <Label htmlFor="password">Password (optional)</Label>
                <Input
                  id="password"
                  type="text"
                  placeholder="Auto-generated if left blank"
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                  disabled={busy}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="moodleUserId">Moodle User ID</Label>
              <Input
                id="moodleUserId"
                value={form.moodleUserId ?? ""}
                onChange={(e) => set("moodleUserId", e.target.value)}
                disabled={busy}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="studentId">Student ID</Label>
              <Input
                id="studentId"
                value={form.studentId ?? ""}
                onChange={(e) => set("studentId", e.target.value)}
                disabled={busy}
              />
            </div>
          </div>

          <div className="flex gap-3">
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? "Save changes" : "Create user"}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
