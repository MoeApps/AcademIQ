"use client";

import { KeyRound, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AuthUser } from "@/lib/types";

interface Props {
  users: AuthUser[];
  onEdit: (user: AuthUser) => void;
  onResetPassword: (user: AuthUser) => void;
  onDelete: (user: AuthUser) => void;
}

export function UsersTable({ users, onEdit, onResetPassword, onDelete }: Props) {
  if (users.length === 0) {
    return (
      <p className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
        No users found.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-border text-left text-muted-foreground">
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium">Email</th>
            <th className="px-4 py-3 font-medium">Role</th>
            <th className="px-4 py-3 font-medium">Moodle ID</th>
            <th className="px-4 py-3 font-medium">Student ID</th>
            <th className="px-4 py-3 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-b border-border/60 last:border-0">
              <td className="px-4 py-3 font-medium text-foreground">{u.fullName}</td>
              <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
              <td className="px-4 py-3">
                <Badge variant={u.role === "admin" ? "default" : "muted"}>
                  {u.role}
                </Badge>
              </td>
              <td className="px-4 py-3 text-muted-foreground">{u.moodleUserId ?? "—"}</td>
              <td className="px-4 py-3 text-muted-foreground">{u.studentId ?? "—"}</td>
              <td className="px-4 py-3">
                <div className="flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(u)}
                    aria-label={`Edit ${u.fullName}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onResetPassword(u)}
                    aria-label={`Reset password for ${u.fullName}`}
                  >
                    <KeyRound className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(u)}
                    aria-label={`Delete ${u.fullName}`}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
