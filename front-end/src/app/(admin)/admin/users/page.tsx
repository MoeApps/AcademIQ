"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Search } from "lucide-react";
import { api } from "@/lib/api";
import type { AuthUser, UserInput } from "@/lib/types";
import { UserFormPanel } from "@/components/admin/UserFormPanel";
import { UsersTable } from "@/components/admin/UsersTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

type FormState = { open: boolean; user?: AuthUser };

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AuthUser[] | null>(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<FormState>({ open: false });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async (term: string) => {
    try {
      const list = await api.getUsers(term || undefined);
      setUsers(list);
    } catch {
      setUsers([]);
      setNotice("Could not load users. Please sign in again.");
    }
  }, []);

  // Debounced search so we don't refetch on every keystroke.
  useEffect(() => {
    const id = setTimeout(() => load(search), 250);
    return () => clearTimeout(id);
  }, [search, load]);

  const handleCreate = async (input: UserInput) => {
    setBusy(true);
    try {
      const { generatedPassword } = await api.createUser(input);
      setForm({ open: false });
      setNotice(
        generatedPassword
          ? `User created. Temporary password: ${generatedPassword} (also emailed).`
          : "User created.",
      );
      await load(search);
    } finally {
      setBusy(false);
    }
  };

  const handleUpdate = async (input: UserInput) => {
    if (!form.user) return;
    setBusy(true);
    try {
      await api.updateUser(form.user.id, input);
      setForm({ open: false });
      setNotice("User updated.");
      await load(search);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (user: AuthUser) => {
    if (!window.confirm(`Delete ${user.fullName}? This cannot be undone.`)) return;
    await api.deleteUser(user.id);
    setNotice(`Deleted ${user.fullName}.`);
    await load(search);
  };

  const handleResetPassword = async (user: AuthUser) => {
    if (!window.confirm(`Reset password for ${user.fullName}?`)) return;
    const { generatedPassword } = await api.resetPassword(user.id);
    setNotice(
      generatedPassword
        ? `Password reset. New temporary password: ${generatedPassword}.`
        : "Password reset.",
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Users</h1>
          <p className="text-muted-foreground">
            Create, edit, and manage AcademIQ accounts.
          </p>
        </div>
        {!form.open && (
          <Button onClick={() => setForm({ open: true })}>
            <Plus className="h-4 w-4" />
            Add user
          </Button>
        )}
      </div>

      {notice && (
        <div className="flex items-start justify-between gap-4 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-foreground">
          <span>{notice}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="text-muted-foreground hover:text-foreground"
          >
            Dismiss
          </button>
        </div>
      )}

      {form.open && (
        <UserFormPanel
          user={form.user}
          busy={busy}
          onSubmit={form.user ? handleUpdate : handleCreate}
          onCancel={() => setForm({ open: false })}
        />
      )}

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, or ID"
          className="pl-9"
        />
      </div>

      {users ? (
        <UsersTable
          users={users}
          onEdit={(user) => setForm({ open: true, user })}
          onResetPassword={handleResetPassword}
          onDelete={handleDelete}
        />
      ) : (
        <Skeleton className="h-64 w-full" />
      )}
    </div>
  );
}
