"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Shield, Users } from "lucide-react";
import { api } from "@/lib/api";
import { useUser } from "@/context/UserContext";
import type { AuthUser } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminOverviewPage() {
  const { user } = useUser();
  const [users, setUsers] = useState<AuthUser[] | null>(null);

  useEffect(() => {
    let active = true;
    api.getUsers().then((list) => {
      if (active) setUsers(list);
    });
    return () => {
      active = false;
    };
  }, []);

  const total = users?.length ?? 0;
  const admins = users?.filter((u) => u.role === "admin").length ?? 0;
  const students = total - admins;

  const stats = [
    { label: "Total Users", value: total },
    { label: "Students", value: students },
    { label: "Admins", value: admins },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Welcome, {user?.fullName.split(" ")[0] ?? "Admin"}
        </h1>
        <p className="text-muted-foreground">
          Manage AcademIQ accounts and access.
        </p>
      </div>

      {users ? (
        <div className="grid gap-6 sm:grid-cols-3">
          {stats.map((s) => (
            <Card key={s.label}>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className="mt-1 text-3xl font-bold text-foreground">{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        <Link href="/admin/users" className="group">
          <Card className="h-full transition-all hover:border-primary/50 hover:shadow-lg">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">Manage Users</h3>
                <p className="text-sm text-muted-foreground">
                  View, create, edit, delete accounts and reset passwords.
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
            </CardContent>
          </Card>
        </Link>

        <Card className="h-full">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground">Role-based access</h3>
              <p className="text-sm text-muted-foreground">
                Students are auto-provisioned from Moodle and can only see their
                own dashboard.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
