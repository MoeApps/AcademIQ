import { AdminHeader } from "@/components/layout/AdminHeader";
import { AuthGuard } from "@/components/layout/AuthGuard";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Admin-only: students hitting any /admin route are redirected to /dashboard.
  return (
    <AuthGuard requiredRole="admin">
      <div className="flex min-h-screen flex-col">
        <AdminHeader />
        <main className="flex-1 bg-background">
          <div className="container py-8">{children}</div>
        </main>
      </div>
    </AuthGuard>
  );
}
