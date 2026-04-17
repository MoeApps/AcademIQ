import { useMemo, useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { useUser } from "@/context/UserContext";
import Footer from "@/components/layout/Footer";
import PerformanceChart from "@/components/dashboard/PerformanceChart";
import StatusBadge from "@/components/dashboard/StatusBadge";
import CourseStatistics from "@/components/dashboard/CourseStatistics";
import ChapterSelect from "@/components/dashboard/ChapterSelect";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, FileText, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  courses as mockCourses,
  coursePerformanceData,
  courseStats,
  getCourseStatus,
} from "@/data/mockData";
import { useNavCourses } from "@/hooks/useNavCourses";
import {
  generateQuizApi,
  generateNotesApi,
  fetchCourseAiQuizzes,
  ApiError,
  type AiQuizDoc,
} from "@/lib/api";

const CoursePage = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const { username } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dateRange, setDateRange] = useState("all");
  const [selectedChapters, setSelectedChapters] = useState<string[]>([]);
  const [quizLoading, setQuizLoading] = useState(false);
  const [notesLoading, setNotesLoading] = useState(false);
  const [previewQuiz, setPreviewQuiz] = useState<AiQuizDoc | null>(null);

  const { data: navCourses } = useNavCourses();
  const allCourses = navCourses ?? mockCourses;

  const course = allCourses.find((c) => c.id === courseId);

  const {
    data: savedQuizzes = [],
    isLoading: quizzesLoading,
    isError: quizzesError,
  } = useQuery({
    queryKey: ["ai-quizzes", courseId],
    queryFn: () => fetchCourseAiQuizzes(courseId!),
    enabled: Boolean(courseId),
  });

  const quizzesByTopic = useMemo(() => {
    if (!course) return new Map<string, AiQuizDoc[]>();
    const map = new Map<string, AiQuizDoc[]>();
    for (const ch of course.chapters) {
      map.set(
        ch,
        savedQuizzes.filter((q) => Array.isArray(q.topics) && q.topics.includes(ch)),
      );
    }
    return map;
  }, [course, savedQuizzes]);

  const performanceData =
    courseId && coursePerformanceData[courseId] ? coursePerformanceData[courseId] : [];
  const stats = courseId ? courseStats[courseId] : undefined;

  const filteredData = useMemo(() => {
    if (!performanceData.length) {
      return [
        { date: "Week 1", score: 72 },
        { date: "Week 2", score: 75 },
        { date: "Week 3", score: 78 },
      ];
    }
    switch (dateRange) {
      case "week":
        return performanceData.slice(-1);
      case "2weeks":
        return performanceData.slice(-2);
      case "month":
        return performanceData.slice(-4);
      default:
        return performanceData;
    }
  }, [performanceData, dateRange]);

  const avgScore =
    filteredData.length > 0 ? filteredData.reduce((sum, d) => sum + d.score, 0) / filteredData.length : 0;
  const courseStatus = getCourseStatus(avgScore);

  if (!course || !courseId) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleGenerateQuiz = async () => {
    if (selectedChapters.length === 0) {
      toast({
        title: "No chapters selected",
        description: "Please select at least one chapter.",
        variant: "destructive",
      });
      return;
    }
    setQuizLoading(true);
    try {
      const res = await generateQuizApi(courseId, course.name, selectedChapters);
      const n = res.questions?.length ?? 0;
      const mode = res.source === "openai" ? "AI-generated" : "Offline template";
      const persist = res.saved === false ? " Not saved — start MongoDB and retry." : "";
      toast({
        title: "Quiz ready",
        description: `${n} question${n === 1 ? "" : "s"} (${mode}).${persist}`,
      });
      await queryClient.invalidateQueries({ queryKey: ["ai-quizzes", courseId] });
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? `HTTP ${e.status}: ${JSON.stringify(e.body)}`
          : (e as Error).message || "Request failed";
      toast({ title: "Quiz failed", description: msg, variant: "destructive" });
    } finally {
      setQuizLoading(false);
    }
  };

  const handleGenerateNotes = async () => {
    if (selectedChapters.length === 0) {
      toast({
        title: "No chapters selected",
        description: "Please select at least one chapter.",
        variant: "destructive",
      });
      return;
    }
    setNotesLoading(true);
    try {
      const res = await generateNotesApi(courseId, course.name, selectedChapters);
      const mode = res.source === "openai" ? "AI" : "Offline";
      const preview = (res.notes || "").replace(/\n+/g, " ").trim().slice(0, 160);
      toast({
        title: "Notes ready",
        description: `${mode}: ${preview}${(res.notes?.length ?? 0) > 160 ? "…" : ""}`,
      });
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? `HTTP ${e.status}: ${JSON.stringify(e.body)}`
          : (e as Error).message || "Request failed";
      toast({ title: "Notes failed", description: msg, variant: "destructive" });
    } finally {
      setNotesLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <DashboardHeader username={username || "Student"} />

      <main className="container flex-1 py-8">
        <div className="mb-8">
          <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
            <span>{course.code}</span>
            <span>•</span>
            <span>{course.instructor}</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground">{course.name}</h1>
          {!coursePerformanceData[courseId] && (
            <p className="mt-2 text-sm text-muted-foreground">
              Demo chart — course may come from API/Mongo.
            </p>
          )}
        </div>

        <div className="mb-8 rounded-xl border border-border bg-card p-6">
          <h3 className="mb-1 text-lg font-semibold text-card-foreground">AI Study Tools</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Pick chapters, then generate a quiz or notes. With <code className="text-xs">OPENAI_API_KEY</code> in the
            backend <code className="text-xs">.env</code>, content is produced by the AI model; otherwise a local
            template is used. Quizzes are stored per course in MongoDB and listed by topic below.
          </p>
          <div className="mb-6">
            <ChapterSelect
              chapters={course.chapters}
              selectedChapters={selectedChapters}
              onSelectionChange={setSelectedChapters}
            />
          </div>
          <div className="flex flex-wrap gap-4">
            <Button onClick={handleGenerateQuiz} className="gap-2" disabled={quizLoading}>
              {quizLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Generate Quiz
            </Button>
            <Button onClick={handleGenerateNotes} variant="outline" className="gap-2" disabled={notesLoading}>
              {notesLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              Generate Notes
            </Button>
          </div>

          <div className="mt-8 border-t border-border pt-6">
            <h4 className="mb-2 text-sm font-semibold text-foreground">Saved quizzes by topic</h4>
            {quizzesError && (
              <p className="text-sm text-muted-foreground">
                Could not load saved quizzes — is the API running at <code className="text-xs">VITE_API_URL</code>?
              </p>
            )}
            {!quizzesError && quizzesLoading && (
              <p className="text-sm text-muted-foreground">Loading saved quizzes…</p>
            )}
            {!quizzesError && !quizzesLoading && (
              <ul className="space-y-4">
                {course.chapters.map((topic) => {
                  const list = quizzesByTopic.get(topic) ?? [];
                  return (
                    <li key={topic} className="rounded-lg border border-border/80 bg-muted/30 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium text-foreground">{topic}</span>
                        <span className="text-xs text-muted-foreground">
                          {list.length} saved generation{list.length === 1 ? "" : "s"}
                        </span>
                      </div>
                      {list.length === 0 ? (
                        <p className="mt-2 text-xs text-muted-foreground">
                          No quiz saved for this topic yet — select it above and generate.
                        </p>
                      ) : (
                        <ul className="mt-2 space-y-2">
                          {list.map((q) => (
                            <li
                              key={q.id}
                              className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground"
                            >
                              <span>
                                {q.questions?.length ?? 0} questions
                                <span className="mx-1.5 text-border">·</span>
                                <span className="capitalize">{q.source}</span>
                                {q.created_at && (
                                  <>
                                    <span className="mx-1.5 text-border">·</span>
                                    {new Date(q.created_at).toLocaleString()}
                                  </>
                                )}
                              </span>
                              <Button type="button" variant="secondary" size="sm" onClick={() => setPreviewQuiz(q)}>
                                Open
                              </Button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <div className="mb-8 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-lg font-semibold text-card-foreground">Course Performance</h3>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select range" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="week">Last Week</SelectItem>
                    <SelectItem value="2weeks">Last 2 Weeks</SelectItem>
                    <SelectItem value="month">Last Month</SelectItem>
                    <SelectItem value="all">All Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <PerformanceChart data={filteredData} title="" />
            </div>
          </div>
          <div className="lg:col-span-1">
            <StatusBadge status={courseStatus} type="course" />

            <div className="mt-6 rounded-xl border border-border bg-card p-6">
              <h3 className="mb-4 text-lg font-semibold text-card-foreground">Course Average</h3>
              <div className="text-center">
                <span className="text-4xl font-bold text-primary">{avgScore.toFixed(1)}%</span>
                <p className="mt-1 text-sm text-muted-foreground">Based on available weekly data</p>
              </div>
            </div>
          </div>
        </div>

        {stats && <CourseStatistics stats={stats} />}
      </main>

      <Footer />

      <Dialog open={!!previewQuiz} onOpenChange={(open) => !open && setPreviewQuiz(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Saved quiz</DialogTitle>
            <DialogDescription>
              {previewQuiz?.topics?.length
                ? `Topics: ${previewQuiz.topics.join(", ")}`
                : "Topics from when this quiz was generated."}
            </DialogDescription>
          </DialogHeader>
          {previewQuiz?.questions?.map((question, idx) => (
            <div key={question.id ?? idx} className="space-y-2 rounded-lg border border-border p-3 text-sm">
              <p className="font-medium text-foreground">
                {idx + 1}. {question.prompt}
              </p>
              <ul className="list-inside list-disc space-y-1 text-muted-foreground">
                {question.choices.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
              <p className="text-xs text-primary">
                <span className="font-semibold">Answer:</span> {question.answer}
              </p>
            </div>
          ))}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CoursePage;
