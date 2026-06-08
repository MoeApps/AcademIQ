import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-4 text-center">
      <GraduationCap className="h-12 w-12 text-primary" />
      <div className="space-y-2">
        <h1 className="text-4xl font-bold text-foreground">404</h1>
        <p className="text-muted-foreground">
          We couldn&apos;t find the page you were looking for.
        </p>
      </div>
      <Link href="/" className={buttonVariants({ variant: "default" })}>
        Back to home
      </Link>
    </div>
  );
}
