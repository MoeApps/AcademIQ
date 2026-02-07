import { useState, useEffect } from "react";
import { useParams, Navigate } from "react-router-dom";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import Footer from "@/components/layout/Footer";
import PerformanceChart from "@/components/dashboard/PerformanceChart";
import StatusBadge from "@/components/dashboard/StatusBadge";
import CourseStatistics from "@/components/dashboard/CourseStatistics";
import { Button } from "@/components/ui/button";
import { Sparkles, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  fetchCourses,
  fetchGradesByStudent,
  fetchCourseStats,
  type CourseApi,
  type CourseStatsApi,
} from "@/lib/api";
import { PerformanceData } from "@/data/mockData";

const DEMO_STUDENT_ID = "S001";

function getCourseStatus(avgScore: number): "Bad" | "Average" | "Good" {
  if (avgScore < 70) return "Bad";
  if (avgScore < 85) return "Average";
  return "Good";
}

const CoursePage = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const { toast } = useToast();
  const [course, setCourse] = useState<CourseApi | null>(null);
  const [finalGrade, setFinalGrade] = useState<number | null>(null);
  const [stats, setStats] = useState<CourseStatsApi | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!courseId) return;
    let cancelled = false;
    (async () => {
      const [coursesRes, gradesRes, statsRes] = await Promise.all([
        fetchCourses(),
        fetchGradesByStudent(DEMO_STUDENT_ID),
        fetchCourseStats(DEMO_STUDENT_ID, courseId),
      ]);
      if (cancelled) return;
      const c = (coursesRes || []).find((x) => x.course_id === courseId) ?? null;
      setCourse(c ?? null);
      const gradeRow = (gradesRes || []).find((g) => g.course_id === courseId);
      setFinalGrade(gradeRow?.final_grade ?? null);
      setStats(statsRes ?? null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  if (!courseId) return <Navigate to="/dashboard" replace />;
  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <DashboardHeader username="Student" />
        <main className="container flex-1 py-8">
          <p className="text-muted-foreground">Loading course…</p>
        </main>
        <Footer />
      </div>
    );
  }
  if (!course) return <Navigate to="/dashboard" replace />;

  const avgScore = finalGrade ?? 0;
  const courseStatus = getCourseStatus(avgScore);
  const performanceData: PerformanceData[] = finalGrade != null
    ? [{ date: "Final grade", score: finalGrade }]
    : [];

  const handleGenerateQuiz = () => {
    toast({
      title: "Generating Quiz",
      description: "AI is creating a personalized quiz based on your course materials...",
    });
  };

  const handleGenerateNotes = () => {
    toast({
      title: "Generating Notes",
      description: "AI is summarizing key concepts from your recent lessons...",
    });
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <DashboardHeader username="Student" />

      <main className="container flex-1 py-8">
        {/* Course Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <span>{course.course_id}</span>
            {course.semester && (
              <>
                <span>•</span>
                <span>{course.semester}</span>
              </>
            )}
          </div>
          <h1 className="text-3xl font-bold text-foreground">{course.course_name ?? course.course_id}</h1>
        </div>

        {/* Performance Section */}
        <div className="grid gap-6 lg:grid-cols-3 mb-8">
          <div className="lg:col-span-2">
            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="mb-4 text-lg font-semibold text-card-foreground">
                Course performance (from API)
              </h3>
              {performanceData.length > 0 ? (
                <PerformanceChart data={performanceData} title="" />
              ) : (
                <p className="text-muted-foreground py-4">No grade data for this course yet.</p>
              )}
            </div>
          </div>
          <div className="lg:col-span-1">
            <StatusBadge status={courseStatus} type="course" />
            <div className="mt-6 rounded-xl border border-border bg-card p-6">
              <h3 className="mb-4 text-lg font-semibold text-card-foreground">
                Final grade
              </h3>
              <div className="text-center">
                <span className="text-4xl font-bold text-primary">
                  {finalGrade != null ? `${avgScore.toFixed(1)}%` : "—"}
                </span>
                <p className="text-sm text-muted-foreground mt-1">
                  From database
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Section */}
        {stats && <CourseStatistics stats={stats} />}

        {/* AI Tools Section */}
        <div className="mt-8 rounded-xl border border-border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold text-card-foreground">AI Study Tools</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Use AI-powered tools to enhance your learning experience.
          </p>
          <div className="flex flex-wrap gap-4">
            <Button onClick={handleGenerateQuiz} className="gap-2">
              <Sparkles className="h-4 w-4" />
              Generate Quiz
            </Button>
            <Button onClick={handleGenerateNotes} variant="outline" className="gap-2">
              <FileText className="h-4 w-4" />
              Generate Notes
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CoursePage;
