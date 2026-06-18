"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";

function InsightsRedirect() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const course = searchParams.get("course");

  useEffect(() => {
    router.replace(course ? `/performance?course=${course}` : "/performance");
  }, [course, router]);

  return <Skeleton className="h-96 w-full" />;
}

export default function InsightsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <InsightsRedirect />
    </Suspense>
  );
}
