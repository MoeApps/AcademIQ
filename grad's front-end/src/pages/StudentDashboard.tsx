import { useEffect, useState, useMemo } from "react";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import Footer from "@/components/layout/Footer";
import PerformanceChart from "@/components/dashboard/PerformanceChart";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { PerformanceData } from "@/data/mockData";
import {
  fetchStudentProfile,
  fetchStudentPredictions,
  fetchStudentExplain,
  fetchGradesByStudent,
  fetchCourses,
  type StudentProfile,
  type StudentPredictions,
} from "@/lib/api";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

const DEMO_STUDENT_ID = "S001";

function getOverallStatusFromRisk(riskLevel: string): "At Risk" | "Good" | "Perfect" {
  const r = riskLevel.toLowerCase();
  if (r.includes("high") || r.includes("medium")) return "At Risk";
  if (r.includes("low")) return "Good";
  return "Good";
}

function getOverallStatusFromScore(avgScore: number): "At Risk" | "Good" | "Perfect" {
  if (avgScore < 70) return "At Risk";
  if (avgScore < 85) return "Good";
  return "Perfect";
}

const StudentDashboard = () => {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [predictions, setPredictions] = useState<StudentPredictions | null>(null);
  const [explain, setExplain] = useState<{ reasons: string[]; summary: string } | null>(null);
  const [grades, setGrades] = useState<{ course_id: string; final_grade: number }[]>([]);
  const [courseNames, setCourseNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [p, pred, ex, gradesRes, coursesRes] = await Promise.all([
        fetchStudentProfile(DEMO_STUDENT_ID),
        fetchStudentPredictions(DEMO_STUDENT_ID),
        fetchStudentExplain(DEMO_STUDENT_ID),
        fetchGradesByStudent(DEMO_STUDENT_ID),
        fetchCourses(),
      ]);
      if (!cancelled) {
        setProfile(p ?? null);
        setPredictions(pred ?? null);
        setExplain(ex ? { reasons: ex.reasons, summary: ex.summary } : null);
        setGrades(
          (gradesRes || []).map((g) => ({
            course_id: g.course_id,
            final_grade: g.final_grade ?? 0,
          }))
        );
        const names: Record<string, string> = {};
        (coursesRes || []).forEach((c) => {
          names[c.course_id] = c.course_name || c.course_id;
        });
        setCourseNames(names);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const performanceData: PerformanceData[] = useMemo(
    () =>
      grades.map((g) => ({
        date: courseNames[g.course_id] || g.course_id,
        score: g.final_grade,
      })),
    [grades, courseNames]
  );
  const avgScore = grades.length
    ? grades.reduce((sum, g) => sum + g.final_grade, 0) / grades.length
    : 0;
  const overallStatus =
    predictions?.risk_level != null && predictions.risk_level !== ""
      ? getOverallStatusFromRisk(predictions.risk_level)
      : getOverallStatusFromScore(avgScore);
  const riskLevel = predictions?.risk_level ?? "";
  const isAtRisk = riskLevel.toLowerCase().includes("medium") || riskLevel.toLowerCase().includes("high");

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <DashboardHeader username="Student" />

      <main className="container flex-1 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Student Dashboard</h1>
          <p className="text-muted-foreground">
            Track your academic progress and recommendations. (Demo: {DEMO_STUDENT_ID})
          </p>
        </div>

        {loading && (
          <p className="text-muted-foreground">Loading profile and predictions…</p>
        )}

        {!loading && isAtRisk && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Risk alert</AlertTitle>
            <AlertDescription>
              At risk in current assessment: <strong>{riskLevel}</strong>. See recommendations below.
            </AlertDescription>
          </Alert>
        )}

        {/* Performance Overview */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <PerformanceChart data={performanceData} title="Performance by course (from API)" />
          </div>
          <div className="lg:col-span-1">
            <StatusBadge status={overallStatus} type="overall" />
            <div className="mt-6 rounded-xl border border-border bg-card p-6">
              <h3 className="mb-4 text-lg font-semibold text-card-foreground">Quick Stats</h3>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Average Score</span>
                  <span className="font-bold text-card-foreground">{grades.length ? `${avgScore.toFixed(1)}%` : "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Risk level (API)</span>
                  <span className="font-bold text-card-foreground">{predictions?.risk_level ?? "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Strong topics</span>
                  <span className="font-bold text-card-foreground">{profile?.strong_topics?.length ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Weak topics</span>
                  <span className="font-bold text-card-foreground">{profile?.weak_topics?.length ?? 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Explainability: why this risk */}
        {explain && (
          <div className="mt-8 rounded-xl border border-border bg-card p-6">
            <h2 className="mb-4 text-xl font-semibold text-card-foreground">Why this risk level?</h2>
            <p className="mb-2 text-muted-foreground">{explain.summary}</p>
            <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
              {explain.reasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        )}

        {/* My recommendations (from API) */}
        <div className="mt-8 rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 text-xl font-semibold text-card-foreground">My recommendations</h2>
          {predictions?.recommendation ? (
            <p className="text-muted-foreground">{predictions.recommendation}</p>
          ) : (
            <p className="text-muted-foreground">
              No recommendations loaded. Ensure backend is running and data is loaded (run load script).
            </p>
          )}
        </div>

        {/* Strong / weak topics from profile */}
        {profile && (profile.strong_topics?.length > 0 || profile.weak_topics?.length > 0) && (
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="mb-3 font-semibold text-card-foreground">Strong areas</h3>
              <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                {profile.strong_topics.map((t) => (
                  <li key={t.course_id}>{t.name} ({t.grade.toFixed(1)})</li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="mb-3 font-semibold text-card-foreground">Areas to improve</h3>
              <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                {profile.weak_topics.map((t) => (
                  <li key={t.course_id}>{t.name} ({t.grade.toFixed(1)})</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default StudentDashboard;
