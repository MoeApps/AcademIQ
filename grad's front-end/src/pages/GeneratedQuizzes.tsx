import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import Footer from "@/components/layout/Footer";
import { useUser } from "@/context/UserContext";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  Sparkles,
  Send,
  RotateCcw,
} from "lucide-react";
import {
  courses,
  quizQuestionBank,
  type QuizQuestion,
} from "@/data/mockData";

const formatTime = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
};

const GeneratedQuizzes = () => {
  const { username } = useUser();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const stateCourseId = (location.state as { courseId?: string } | null)?.courseId;
  const stateChapters = (location.state as { chapters?: string[] } | null)?.chapters;

  const courseId = stateCourseId && quizQuestionBank[stateCourseId] ? stateCourseId : "cs101";
  const course = courses.find((c) => c.id === courseId)!;
  const questions: QuizQuestion[] = quizQuestionBank[courseId];

  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [seconds, setSeconds] = useState(15 * 60);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (loading || submitted) return;
    const i = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(i);
  }, [loading, submitted]);

  useEffect(() => {
    if (seconds === 0 && !submitted) {
      setSubmitted(true);
      toast({ title: "Time's up", description: "Your quiz has been submitted automatically." });
    }
  }, [seconds, submitted, toast]);

  const score = useMemo(
    () =>
      questions.reduce(
        (acc, q) => acc + (answers[q.id] === q.correctIndex ? 1 : 0),
        0
      ),
    [answers, questions]
  );

  const answeredCount = Object.keys(answers).length;
  const progress = Math.round((answeredCount / questions.length) * 100);
  const q = questions[current];

  const select = (idx: number) => {
    if (submitted) return;
    setAnswers((a) => ({ ...a, [q.id]: idx }));
  };

  const submit = () => {
    setSubmitted(true);
    toast({ title: "Quiz submitted", description: `You scored ${score}/${questions.length}.` });
  };

  const reset = () => {
    setAnswers({});
    setCurrent(0);
    setSubmitted(false);
    setSeconds(15 * 60);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <DashboardHeader username={username || "Student"} />

      <main className="container flex-1 py-8">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" /> AI-Generated Quiz
            </div>
            <h1 className="text-3xl font-bold text-foreground">{course.name} Practice Quiz</h1>
            <p className="text-sm text-muted-foreground">
              {course.code} • {course.instructor}
              {stateChapters && stateChapters.length > 0 && (
                <> • Chapters: {stateChapters.join(", ")}</>
              )}
            </p>
          </div>

          <div
            className={cn(
              "flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 font-mono text-lg",
              seconds < 60 && !submitted && "border-destructive/40 text-destructive animate-pulse"
            )}
          >
            <Clock className="h-4 w-4" />
            {formatTime(seconds)}
          </div>
        </div>

        {loading ? (
          <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
            <Skeleton className="h-96 rounded-xl" />
            <Skeleton className="h-96 rounded-xl" />
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
            {/* Sidebar question palette */}
            <aside className="rounded-xl border border-border bg-card p-5 h-fit lg:sticky lg:top-20">
              <h3 className="mb-3 text-sm font-semibold text-card-foreground">Questions</h3>
              <div className="grid grid-cols-5 gap-2">
                {questions.map((qq, i) => {
                  const answered = answers[qq.id] !== undefined;
                  const isCurrent = i === current;
                  const correct = submitted && answers[qq.id] === qq.correctIndex;
                  const wrong = submitted && answered && answers[qq.id] !== qq.correctIndex;
                  return (
                    <button
                      key={qq.id}
                      onClick={() => setCurrent(i)}
                      className={cn(
                        "h-9 w-9 rounded-md border text-sm font-medium transition-all",
                        isCurrent && "ring-2 ring-primary ring-offset-2 ring-offset-card",
                        correct && "border-emerald-500 bg-emerald-500/15 text-emerald-700",
                        wrong && "border-destructive bg-destructive/10 text-destructive",
                        !submitted && answered && "border-primary bg-primary/10 text-primary",
                        !submitted && !answered && "border-border bg-secondary text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {i + 1}
                    </button>
                  );
                })}
              </div>

              <div className="mt-5 space-y-2 text-xs text-muted-foreground">
                <p>Answered: {answeredCount}/{questions.length}</p>
                <Progress value={progress} className="h-1.5" />
              </div>

              {submitted && (
                <div className="mt-5 rounded-lg border border-border bg-secondary/60 p-3 text-center">
                  <p className="text-xs text-muted-foreground">Your Score</p>
                  <p className="text-2xl font-bold text-card-foreground tabular-nums">
                    {score}<span className="text-sm font-normal text-muted-foreground">/{questions.length}</span>
                  </p>
                </div>
              )}
            </aside>

            {/* Question card */}
            <section className="rounded-xl border border-border bg-card p-6">
              <div className="mb-4 flex items-center justify-between text-sm text-muted-foreground">
                <span>Question {current + 1} of {questions.length}</span>
                <span>{progress}% complete</span>
              </div>
              <Progress value={((current + 1) / questions.length) * 100} className="mb-6 h-1.5" />

              <h2 className="mb-6 text-xl font-semibold text-card-foreground leading-relaxed">
                {q.question}
              </h2>

              <div className="space-y-3">
                {q.options.map((opt, idx) => {
                  const selected = answers[q.id] === idx;
                  const isCorrect = submitted && idx === q.correctIndex;
                  const isWrong = submitted && selected && idx !== q.correctIndex;
                  return (
                    <button
                      key={idx}
                      onClick={() => select(idx)}
                      disabled={submitted}
                      className={cn(
                        "group flex w-full items-center gap-3 rounded-lg border p-4 text-left transition-all",
                        "hover:border-primary/60 hover:bg-secondary/60",
                        selected && !submitted && "border-primary bg-primary/5",
                        isCorrect && "border-emerald-500 bg-emerald-500/10",
                        isWrong && "border-destructive bg-destructive/10",
                        !selected && !isCorrect && !isWrong && "border-border bg-card",
                        submitted && "cursor-default"
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                          selected && !submitted && "border-primary bg-primary text-primary-foreground",
                          isCorrect && "border-emerald-500 bg-emerald-500 text-white",
                          isWrong && "border-destructive bg-destructive text-destructive-foreground",
                          !selected && !isCorrect && !isWrong && "border-border text-muted-foreground"
                        )}
                      >
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="text-sm text-card-foreground">{opt}</span>
                      {isCorrect && <CheckCircle2 className="ml-auto h-5 w-5 text-emerald-600" />}
                    </button>
                  );
                })}
              </div>

              {/* Nav buttons */}
              <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
                <Button
                  variant="outline"
                  onClick={() => setCurrent((c) => Math.max(0, c - 1))}
                  disabled={current === 0}
                  className="gap-2"
                >
                  <ArrowLeft className="h-4 w-4" /> Previous
                </Button>

                <div className="flex gap-2">
                  {submitted ? (
                    <>
                      <Button variant="outline" onClick={reset} className="gap-2">
                        <RotateCcw className="h-4 w-4" /> Retake
                      </Button>
                      <Button onClick={() => navigate("/dashboard")} className="gap-2">
                        Back to Dashboard
                      </Button>
                    </>
                  ) : current === questions.length - 1 ? (
                    <Button onClick={submit} className="gap-2">
                      <Send className="h-4 w-4" /> Submit Quiz
                    </Button>
                  ) : (
                    <Button
                      onClick={() => setCurrent((c) => Math.min(questions.length - 1, c + 1))}
                      className="gap-2"
                    >
                      Next <ArrowRight className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </section>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default GeneratedQuizzes;