import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import Footer from "@/components/layout/Footer";
import { useUser } from "@/context/UserContext";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Sparkles,
  Download,
  Copy,
  ArrowLeft,
  CheckCircle2,
  BookOpen,
} from "lucide-react";
import { courses, noteContentBank, type NoteContent } from "@/data/mockData";

const buildMarkdown = (n: NoteContent) => {
  const lines = [
    `# ${n.title}`,
    "",
    `> ${n.summary}`,
    "",
    "## Key Highlights",
    ...n.keyPoints.map((k) => `- ${k}`),
    "",
    ...n.sections.flatMap((s) => [`## ${s.heading}`, "", s.body, ""]),
  ];
  return lines.join("\n");
};

const GeneratedNotes = () => {
  const { username } = useUser();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const contentRef = useRef<HTMLDivElement>(null);

  const stateCourseId = (location.state as { courseId?: string } | null)?.courseId;
  const stateChapters = (location.state as { chapters?: string[] } | null)?.chapters;

  const courseId = stateCourseId && noteContentBank[stateCourseId] ? stateCourseId : "cs101";
  const course = courses.find((c) => c.id === courseId)!;
  const note = noteContentBank[courseId];

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 700);
    return () => clearTimeout(t);
  }, []);

  const md = useMemo(() => buildMarkdown(note), [note]);

  const handleDownload = () => {
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${note.title.replace(/\s+/g, "_")}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Notes downloaded", description: "Saved as Markdown file." });
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(md);
      toast({ title: "Copied to clipboard", description: "Notes copied successfully." });
    } catch {
      toast({ title: "Copy failed", description: "Please try again.", variant: "destructive" });
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <DashboardHeader username={username || "Student"} />

      <main className="container flex-1 py-8">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" /> AI-Generated Notes
            </div>
            <h1 className="text-3xl font-bold text-foreground">{note.title}</h1>
            <p className="text-sm text-muted-foreground">
              {course.code} • {course.name} • {course.instructor}
              {stateChapters && stateChapters.length > 0 && (
                <> • Chapters: {stateChapters.join(", ")}</>
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => navigate(-1)} className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <Button variant="outline" onClick={handleCopy} className="gap-2">
              <Copy className="h-4 w-4" /> Copy Notes
            </Button>
            <Button onClick={handleDownload} className="gap-2">
              <Download className="h-4 w-4" /> Download Notes
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-64 rounded-xl" />
            <Skeleton className="h-96 rounded-xl" />
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
            {/* Main scrollable notes */}
            <article
              ref={contentRef}
              className="rounded-xl border border-border bg-card p-8 lg:max-h-[calc(100vh-220px)] lg:overflow-y-auto"
            >
              {/* AI Summary */}
              <section className="mb-8">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-primary">
                  <Sparkles className="h-4 w-4" /> AI Summary
                </div>
                <p className="text-base leading-relaxed text-card-foreground">{note.summary}</p>
              </section>

              <hr className="my-8 border-border" />

              {/* Key points */}
              <section className="mb-8">
                <h2 className="mb-4 text-xl font-bold text-card-foreground">Key Highlights</h2>
                <ul className="space-y-3">
                  {note.keyPoints.map((k, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                      <span className="text-sm leading-relaxed text-card-foreground">{k}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <hr className="my-8 border-border" />

              {/* Sections */}
              <section className="space-y-8">
                {note.sections.map((s, i) => (
                  <div key={i}>
                    <h2 className="mb-3 text-xl font-bold text-card-foreground">{s.heading}</h2>
                    <p className="text-base leading-7 text-muted-foreground">{s.body}</p>
                    {i < note.sections.length - 1 && (
                      <hr className="mt-8 border-border" />
                    )}
                  </div>
                ))}
              </section>
            </article>

            {/* Side TOC */}
            <aside className="rounded-xl border border-border bg-card p-5 h-fit lg:sticky lg:top-20">
              <div className="mb-3 flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-card-foreground">In This Document</h3>
              </div>
              <ul className="space-y-2 text-sm">
                <li className="text-muted-foreground hover:text-foreground transition-colors cursor-default">AI Summary</li>
                <li className="text-muted-foreground hover:text-foreground transition-colors cursor-default">Key Highlights</li>
                {note.sections.map((s, i) => (
                  <li key={i} className="text-muted-foreground hover:text-foreground transition-colors cursor-default">
                    {s.heading}
                  </li>
                ))}
              </ul>

              <div className="mt-5 rounded-lg border border-border bg-secondary/60 p-3 text-xs text-muted-foreground">
                <p className="font-medium text-card-foreground mb-1">Course</p>
                <p>{course.name}</p>
              </div>
            </aside>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default GeneratedNotes;