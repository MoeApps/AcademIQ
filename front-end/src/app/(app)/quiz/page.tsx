"use client";

import { useEffect, useRef, useState } from "react";
import {
  Loader2,
  Sparkles,
  CheckCircle2,
  Clock,
  BarChart3,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Trash2,
  Upload,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

// ─── Types ────────────────────────────────────────────────────────────────────

interface QuizQuestion {
  question_num: number;
  question: string;
  question_type: "multiple_choice" | "short_answer";
  options: string[];
  correct_answer: string;
  difficulty: number;
  keywords: string[];
}

interface Quiz {
  id: string;
  created_at: string;
  total_questions: number;
  multiple_choice_count: number;
  short_answer_count: number;
  average_difficulty: number;
  source_file: string | null;
  questions: QuizQuestion[];
}

// ─── API helpers ──────────────────────────────────────────────────────────────
// Points at the existing AcademIQ backend — no separate server needed.
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function apiGenerateQuiz(file: File, numQuestions: number): Promise<Quiz> {
  const body = new FormData();
  body.append("file", file);
  const res = await fetch(
    `${API_BASE}/api/quiz/generate?num_questions=${numQuestions}`,
    { method: "POST", body, credentials: "include" },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? `Server error ${res.status}`);
  }
  return res.json();
}

async function apiFetchQuizzes(): Promise<Quiz[]> {
  const res = await fetch(`${API_BASE}/api/quiz/quizzes?limit=20`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch quiz history.");
  return res.json();
}

async function apiDeleteQuiz(id: string): Promise<void> {
  await fetch(`${API_BASE}/api/quiz/quizzes/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DifficultyBadge({ value }: { value: number }) {
  const label  = value < 0.5 ? "Easy" : value < 0.7 ? "Medium" : "Hard";
  const colour =
    value < 0.5
      ? "bg-green-100 text-green-700"
      : value < 0.7
        ? "bg-amber-100 text-amber-700"
        : "bg-red-100 text-red-700";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colour}`}>
      {label}
    </span>
  );
}

function QuestionCard({
  q,
  index,
  revealed,
  selected,
  onSelect,
  onReveal,
}: {
  q: QuizQuestion;
  index: number;
  revealed: boolean;
  selected: string | null;
  onSelect: (opt: string) => void;
  onReveal: () => void;
}) {
  const shuffled = useRef<string[]>([]);
  if (shuffled.current.length === 0 && q.options.length > 0) {
    shuffled.current = [...q.options].sort(() => Math.random() - 0.5);
  }

  const isCorrect = selected === q.correct_answer;

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
            {index}
          </span>
          <p className="text-sm font-medium leading-snug">{q.question}</p>
        </div>
        <DifficultyBadge value={q.difficulty} />
      </div>

      {q.question_type === "multiple_choice" && (
        <div className="space-y-2 pl-9">
          {shuffled.current.map((opt) => {
            const isSelected  = selected === opt;
            const showCorrect = revealed && opt === q.correct_answer;
            const showWrong   = revealed && isSelected && !isCorrect;
            return (
              <button
                key={opt}
                disabled={revealed}
                onClick={() => onSelect(opt)}
                className={[
                  "w-full rounded-lg border px-4 py-2.5 text-left text-sm transition-colors",
                  showCorrect
                    ? "border-green-500 bg-green-50 font-medium text-green-700"
                    : showWrong
                      ? "border-red-400 bg-red-50 text-red-700"
                      : isSelected
                        ? "border-primary bg-primary/5 text-foreground"
                        : "border-border bg-background hover:bg-muted/50",
                ].join(" ")}
              >
                {opt}
              </button>
            );
          })}
        </div>
      )}

      {q.question_type === "short_answer" && (
        <div className="pl-9 space-y-2">
          <textarea
            rows={3}
            disabled={revealed}
            placeholder="Write your answer here…"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          {revealed && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-xs text-green-700">
              <strong>Sample answer:</strong> {q.correct_answer}
            </div>
          )}
        </div>
      )}

      <div className="pl-9 flex items-center gap-3">
        {!revealed ? (
          <Button
            size="sm"
            variant="outline"
            onClick={onReveal}
            disabled={!selected && q.question_type === "multiple_choice"}
          >
            Check answer
          </Button>
        ) : q.question_type === "multiple_choice" ? (
          isCorrect ? (
            <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
              <CheckCircle2 className="h-4 w-4" /> Correct!
            </span>
          ) : (
            <span className="text-sm text-red-600 font-medium">
              Incorrect — correct answer highlighted above.
            </span>
          )
        ) : null}
      </div>
    </div>
  );
}

function QuizViewer({ quiz, onClose }: { quiz: Quiz; onClose: () => void }) {
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  const [selected, setSelected] = useState<Record<number, string | null>>({});
  const [showAll,  setShowAll]  = useState(false);

  const score = quiz.questions.filter(
    (q, i) =>
      q.question_type === "multiple_choice" && selected[i] === q.correct_answer,
  ).length;
  const mcTotal  = quiz.questions.filter((q) => q.question_type === "multiple_choice").length;
  const answered = Object.keys(revealed).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
        <div>
          <h2 className="font-semibold text-foreground">
            {quiz.source_file ?? "Quiz"} &mdash; {quiz.total_questions} questions
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Generated {new Date(quiz.created_at).toLocaleString()}
          </p>
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          <span className="flex items-center gap-1 text-muted-foreground">
            <BarChart3 className="h-4 w-4" />
            Avg difficulty: {(quiz.average_difficulty * 100).toFixed(0)}%
          </span>
          {mcTotal > 0 && answered > 0 && (
            <span className="flex items-center gap-1 text-primary font-medium">
              <CheckCircle2 className="h-4 w-4" />
              Score: {score}/{mcTotal}
            </span>
          )}
          <Button size="sm" variant="ghost" onClick={onClose}>
            <RotateCcw className="h-4 w-4 mr-1" /> New quiz
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {(showAll ? quiz.questions : quiz.questions.slice(0, 5)).map((q, i) => (
          <QuestionCard
            key={q.question_num}
            q={q}
            index={i + 1}
            revealed={!!revealed[i]}
            selected={selected[i] ?? null}
            onSelect={(opt) => setSelected((s) => ({ ...s, [i]: opt }))}
            onReveal={() => setRevealed((r) => ({ ...r, [i]: true }))}
          />
        ))}
      </div>

      {quiz.questions.length > 5 && (
        <Button variant="outline" className="w-full" onClick={() => setShowAll((v) => !v)}>
          {showAll ? (
            <><ChevronUp className="h-4 w-4 mr-1" /> Show fewer</>
          ) : (
            <><ChevronDown className="h-4 w-4 mr-1" /> Show all {quiz.questions.length} questions</>
          )}
        </Button>
      )}
    </div>
  );
}

function HistoryPanel({
  quizzes,
  onOpen,
  onDelete,
}: {
  quizzes: Quiz[];
  onOpen: (q: Quiz) => void;
  onDelete: (id: string) => void;
}) {
  if (quizzes.length === 0) return null;
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        Recent quizzes
      </h3>
      {quizzes.map((q) => (
        <div
          key={q.id}
          className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3 hover:bg-muted/30 transition-colors"
        >
          <button className="flex-1 text-left" onClick={() => onOpen(q)}>
            <p className="text-sm font-medium truncate">
              {q.source_file ?? "Untitled quiz"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              <Clock className="inline h-3 w-3 mr-1" />
              {new Date(q.created_at).toLocaleString()} &bull; {q.total_questions} Qs &bull; avg{" "}
              {(q.average_difficulty * 100).toFixed(0)}% difficulty
            </p>
          </button>
          <button
            onClick={() => onDelete(q.id)}
            className="text-muted-foreground hover:text-destructive transition-colors"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function QuizPage() {
  const [file,         setFile]         = useState<File | null>(null);
  const [numQuestions, setNumQuestions] = useState(10);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [activeQuiz,   setActiveQuiz]   = useState<Quiz | null>(null);
  const [history,      setHistory]      = useState<Quiz[] | null>(null);
  const [loadingHist,  setLoadingHist]  = useState(true);

  useEffect(() => {
    apiFetchQuizzes()
      .then(setHistory)
      .catch(() => setHistory([]))
      .finally(() => setLoadingHist(false));
  }, []);

  const handleGenerate = async () => {
    if (!file) return;
    setIsGenerating(true);
    setError(null);
    try {
      const quiz = await apiGenerateQuiz(file, numQuestions);
      setActiveQuiz(quiz);
      setHistory((h) => (h ? [quiz, ...h] : [quiz]));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this quiz? This cannot be undone.")) return;
    await apiDeleteQuiz(id);
    setHistory((h) => (h ? h.filter((q) => q.id !== id) : h));
    if (activeQuiz?.id === id) setActiveQuiz(null);
  };

  if (activeQuiz) {
    return (
      <div className="space-y-8">
        <QuizViewer quiz={activeQuiz} onClose={() => setActiveQuiz(null)} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Quiz Generation</h1>
        <p className="text-muted-foreground">
          Upload a management PDF or PPTX, choose how many questions, and get an
          AI-generated quiz.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 space-y-5 max-w-lg">
        {/* File picker */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Document (PDF or PPTX)
          </label>
          <label
            htmlFor="file-upload"
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/30 px-6 py-8 text-center hover:border-primary/40 transition-colors"
          >
            {file ? (
              <>
                <FileText className="h-8 w-8 text-primary" />
                <span className="text-sm font-medium text-foreground">{file.name}</span>
                <span className="text-xs text-muted-foreground">
                  {(file.size / 1024).toFixed(1)} KB — click to change
                </span>
              </>
            ) : (
              <>
                <Upload className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Click to upload a <strong>PDF</strong> or <strong>PPTX</strong>
                </span>
              </>
            )}
            <input
              id="file-upload"
              type="file"
              accept=".pdf,.ppt,.pptx"
              className="sr-only"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setError(null);
              }}
            />
          </label>
        </div>

        {/* Number of questions slider */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Number of questions
          </label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={5}
              max={30}
              step={1}
              value={numQuestions}
              onChange={(e) => setNumQuestions(Number(e.target.value))}
              className="flex-1 accent-primary"
            />
            <span className="w-8 text-center text-sm font-semibold text-foreground">
              {numQuestions}
            </span>
          </div>
        </div>

        {error && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <Button
          className="w-full"
          disabled={!file || isGenerating}
          onClick={handleGenerate}
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating quiz…
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Generate Quiz
            </>
          )}
        </Button>
      </div>

      {loadingHist ? (
        <Skeleton className="h-32 w-full" />
      ) : (
        <HistoryPanel
          quizzes={history ?? []}
          onOpen={setActiveQuiz}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
