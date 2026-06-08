import { AppHeader } from "@/components/layout/AppHeader";
import { AuthGuard } from "@/components/layout/AuthGuard";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="flex min-h-screen flex-col">
        <AppHeader />
        <main className="flex-1 bg-background">
          <div className="container py-8">{children}</div>
        </main>
      </div>
    </AuthGuard>
  );
}
