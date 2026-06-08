import { BookOpen, CheckCircle2, GaugeCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { DashboardStats } from "@/lib/types";

function Stat({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof BookOpen;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}

export function QuickStatsCard({ stats }: { stats: DashboardStats }) {
  return (
    <Card>
      <CardContent className="grid gap-6 p-6 sm:grid-cols-3">
        <Stat
          icon={GaugeCircle}
          label="Average Score"
          value={`${stats.averageScore.toFixed(1)}%`}
          hint="Across graded Moodle tasks"
        />
        <Stat
          icon={CheckCircle2}
          label="Task Completion"
          value={`${stats.averageCompletion}%`}
          hint="Average across courses"
        />
        <Stat
          icon={BookOpen}
          label="Enrolled Courses"
          value={`${stats.enrolledCourses}`}
        />
      </CardContent>
    </Card>
  );
}
