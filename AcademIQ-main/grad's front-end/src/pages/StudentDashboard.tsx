import DashboardHeader from "@/components/dashboard/DashboardHeader";
import Footer from "@/components/layout/Footer";
import PerformanceChart from "@/components/dashboard/PerformanceChart";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { weeklyPerformanceData, getOverallStatus } from "@/data/mockData";
import { useUser } from "@/context/UserContext";
import { useStudentMl } from "@/hooks/useStudentMl";
import { useApiHealth } from "@/hooks/useApiHealth";
import { Skeleton } from "@/components/ui/skeleton";
import { getApiBase } from "@/lib/api";

function riskClusterToOverall(risk: number | undefined): "At Risk" | "Good" | "Perfect" {
  if (risk === 2) return "At Risk";
  if (risk === 1) return "Good";
  if (risk === 0) return "Perfect";
  return "Good";
}

const StudentDashboard = () => {
  const { username, studentId } = useUser();
  const { data: health } = useApiHealth();
  const { data: ml, isLoading: mlLoading, isError: mlError } = useStudentMl(studentId || undefined);

  const avgScore = weeklyPerformanceData.reduce((sum, d) => sum + d.score, 0) / weeklyPerformanceData.length;
  const mockStatus = getOverallStatus(avgScore);

  const risk = ml?.result?.risk_cluster;
  const overallFromApi = risk !== undefined ? riskClusterToOverall(risk) : null;
  const overallStatus = overallFromApi ?? mockStatus;

  const chartData =
    ml?.result?.features?.avg_final_grade != null
      ? weeklyPerformanceData.map((d, i) => ({
          ...d,
          score: Math.min(
            100,
            Math.max(0, (ml.result.features.avg_final_grade as number) * 100 + (i - 3) * 2)
          ),
        }))
      : weeklyPerformanceData;

  const displayAvg =
    ml?.result?.features?.avg_final_grade != null
      ? (ml.result.features.avg_final_grade as number) * 100
      : avgScore;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <DashboardHeader username={username || "Student"} />

      <main className="container flex-1 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Student Dashboard</h1>
            <p className="text-muted-foreground">Track progress; ML risk updates when you Sync from the extension.</p>
          </div>
          <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
            API: {getApiBase()} {health?.message ? "· connected" : ""}
          </div>
        </div>

        {studentId && (
          <div className="mb-6 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm">
            <span className="font-medium text-foreground">Student ID: </span>
            <code className="rounded bg-muted px-1.5 py-0.5 text-foreground">{studentId}</code>
            {mlLoading && <Skeleton className="mt-2 h-10 w-full" />}
            {!mlLoading && mlError && (
              <p className="mt-2 text-destructive">Could not reach the API. Check that the backend is running.</p>
            )}
            {!mlLoading && !mlError && ml === null && (
              <p className="mt-2 text-muted-foreground">
                No stored ML result yet. Use the same Student ID in Sign In as in the extension, then Sync from the
                extension.
              </p>
            )}
            {!mlLoading && ml?.result && (
              <div className="mt-2 space-y-1 text-foreground">
                <p>
                  <span className="text-muted-foreground">Risk cluster:</span> {ml.result.risk_cluster}{" "}
                  <span className="text-muted-foreground">·</span> {ml.result.recommendation}
                </p>
              </div>
            )}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <PerformanceChart
              data={chartData}
              title={ml?.result ? "Performance trend (scaled from ML features)" : "Weekly Performance Overview (demo)"}
            />
          </div>
          <div className="lg:col-span-1">
            <StatusBadge status={overallStatus} type="overall" />

            <div className="mt-6 rounded-xl border border-border bg-card p-6">
              <h3 className="mb-4 text-lg font-semibold text-card-foreground">Quick Stats</h3>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Est. grade (from ML features)</span>
                  <span className="font-bold text-card-foreground">{displayAvg.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Active days (API)</span>
                  <span className="font-bold text-card-foreground">
                    {ml?.result?.features?.active_days != null
                      ? String(Math.round(ml.result.features.active_days as number))
                      : "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Courses (Mongo)</span>
                  <span className="font-bold text-card-foreground">see My Courses menu</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default StudentDashboard;
