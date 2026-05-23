import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Trophy,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Sparkles,
  BookOpen,
  Clock,
  Activity,
  Target,
  Brain,
  Download,
  ArrowLeft,
  Calendar,
} from "lucide-react";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@/context/UserContext";
import { cn } from "@/lib/utils";

type Classification = "High Performer" | "Average Performer" | "At Risk";

const classification: Classification = "High Performer";
const confidence = 87;

const classificationConfig: Record<
  Classification,
  { icon: typeof Trophy; color: string; bg: string; border: string; explanation: string }
> = {
  "High Performer": {
    icon: Trophy,
    color: "text-emerald-600",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    explanation:
      "Based on engagement and assessment behavior, the student is classified as a High Performer.",
  },
  "Average Performer": {
    icon: Activity,
    color: "text-amber-600",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    explanation:
      "The student shows steady engagement with room to grow toward top-tier performance.",
  },
  "At Risk": {
    icon: AlertTriangle,
    color: "text-destructive",
    bg: "bg-destructive/10",
    border: "border-destructive/30",
    explanation:
      "Engagement and assessment patterns suggest the student needs immediate support.",
  },
};

const strengths = [
  { icon: CheckCircle2, text: "Strong quiz performance across modules" },
  { icon: TrendingUp, text: "High activity before exam periods" },
  { icon: Target, text: "Consistent attendance in live sessions" },
];

const weaknesses = [
  { icon: Clock, text: "Late assignment submissions" },
  { icon: Activity, text: "Inconsistent weekly study behavior" },
  { icon: BookOpen, text: "Low interaction with reading materials" },
];

const recommendations = [
  {
    title: "Review lecture materials regularly",
    description: "Spend 30 minutes daily revisiting recent lectures.",
    priority: "High",
    icon: BookOpen,
  },
  {
    title: "Start assignments earlier",
    description: "Begin work within 48 hours of assignment release.",
    priority: "High",
    icon: Clock,
  },
  {
    title: "Practice more quizzes",
    description: "Take at least two practice quizzes per week.",
    priority: "Medium",
    icon: Sparkles,
  },
  {
    title: "Increase study consistency",
    description: "Maintain a steady weekly study schedule.",
    priority: "Medium",
    icon: Activity,
  },
  {
    title: "Maintain current engagement",
    description: "Keep up your participation in discussions.",
    priority: "Low",
    icon: CheckCircle2,
  },
];

const priorityVariant = (p: string) =>
  p === "High"
    ? "bg-destructive/10 text-destructive border-destructive/30"
    : p === "Medium"
    ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
    : "bg-emerald-500/10 text-emerald-600 border-emerald-500/30";

const progressData = [
  { week: "W1", engagement: 55, quiz: 60, predicted: 62 },
  { week: "W2", engagement: 60, quiz: 65, predicted: 66 },
  { week: "W3", engagement: 68, quiz: 70, predicted: 71 },
  { week: "W4", engagement: 72, quiz: 75, predicted: 76 },
  { week: "W5", engagement: 78, quiz: 80, predicted: 81 },
  { week: "W6", engagement: 82, quiz: 84, predicted: 85 },
  { week: "W7", engagement: 85, quiz: 88, predicted: 87 },
  { week: "W8", engagement: 88, quiz: 90, predicted: 89 },
];

const timeline = [
  { week: "Week 1", text: "Improve quiz participation", tone: "warning" },
  { week: "Week 2", text: "Submit assignments on time", tone: "warning" },
  { week: "Week 3", text: "Engagement improved by 15%", tone: "success" },
  { week: "Week 4", text: "Quiz accuracy trending upward", tone: "success" },
  { week: "Week 5", text: "Student behavior becoming more consistent", tone: "success" },
  { week: "Week 6", text: "Maintain current weekly pace", tone: "info" },
];

const StudentInsights = () => {
  const { username } = useUser();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 700);
    return () => clearTimeout(t);
  }, []);

  const cfg = classificationConfig[classification];
  const ClassIcon = cfg.icon;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <DashboardHeader username={username || "Student"} />

      <main className="container flex-1 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="mb-2 gap-2 text-muted-foreground"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Brain className="h-7 w-7 text-primary" />
              Personalized Student Insights
            </h1>
            <p className="text-muted-foreground mt-1">
              AI-generated analysis of your performance and study behavior.
            </p>
          </div>
          <Button variant="outline" className="gap-2 rounded-xl">
            <Download className="h-4 w-4" />
            Export Report
          </Button>
        </div>

        {/* Section 1 — Classification */}
        {loading ? (
          <Skeleton className="h-40 w-full rounded-xl mb-8" />
        ) : (
          <Card
            className={cn(
              "mb-8 overflow-hidden border transition-all hover:shadow-lg",
              cfg.border
            )}
          >
            <div className={cn("p-6 bg-gradient-to-r from-primary/5 via-transparent to-transparent", cfg.bg)}>
              <div className="flex flex-col md:flex-row md:items-center gap-6">
                <div className={cn("flex h-16 w-16 items-center justify-center rounded-2xl", cfg.bg)}>
                  <ClassIcon className={cn("h-8 w-8", cfg.color)} />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Student Classification</p>
                  <h2 className={cn("text-2xl font-bold", cfg.color)}>{classification}</h2>
                  <p className="text-sm text-muted-foreground mt-2 max-w-2xl">{cfg.explanation}</p>
                </div>
                <div className="md:w-56 w-full">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>AI Confidence</span>
                    <span className="font-semibold text-foreground">{confidence}%</span>
                  </div>
                  <Progress value={confidence} className="h-2" />
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Section 2 + 3 */}
        <div className="grid gap-6 lg:grid-cols-2 mb-8">
          {loading ? (
            <>
              <Skeleton className="h-72 rounded-xl" />
              <Skeleton className="h-72 rounded-xl" />
            </>
          ) : (
            <>
              <Card className="transition-all hover:shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" />
                    Behavioral Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-emerald-600 font-semibold mb-2">
                      Strengths
                    </p>
                    <ul className="space-y-2">
                      {strengths.map((s, i) => {
                        const Icon = s.icon;
                        return (
                          <li
                            key={i}
                            className="flex items-start gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3"
                          >
                            <Icon className="h-4 w-4 text-emerald-600 mt-0.5" />
                            <span className="text-sm text-foreground">{s.text}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-destructive font-semibold mb-2">
                      Areas to Improve
                    </p>
                    <ul className="space-y-2">
                      {weaknesses.map((w, i) => {
                        const Icon = w.icon;
                        return (
                          <li
                            key={i}
                            className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-3"
                          >
                            <Icon className="h-4 w-4 text-destructive mt-0.5" />
                            <span className="text-sm text-foreground">{w.text}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </CardContent>
              </Card>

              <Card className="transition-all hover:shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    AI Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {recommendations.map((r, i) => {
                    const Icon = r.icon;
                    return (
                      <div
                        key={i}
                        className="group flex items-start gap-3 rounded-xl border border-border bg-card p-3 transition-all hover:border-primary/40 hover:shadow-md"
                      >
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-foreground">{r.title}</p>
                            <Badge variant="outline" className={cn("text-[10px]", priorityVariant(r.priority))}>
                              {r.priority}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{r.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Section 4 — Progress Tracking */}
        {loading ? (
          <Skeleton className="h-80 w-full rounded-xl mb-8" />
        ) : (
          <Card className="mb-8 transition-all hover:shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Progress Tracking
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={progressData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="week" className="text-xs" stroke="hsl(var(--muted-foreground))" />
                    <YAxis className="text-xs" stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "0.5rem",
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="engagement"
                      name="Engagement"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="quiz"
                      name="Quiz Scores"
                      stroke="hsl(160 84% 39%)"
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="predicted"
                      name="Predicted Performance"
                      stroke="hsl(38 92% 50%)"
                      strokeWidth={2.5}
                      strokeDasharray="5 5"
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Section 5 — Timeline */}
        {loading ? (
          <Skeleton className="h-64 w-full rounded-xl" />
        ) : (
          <Card className="transition-all hover:shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Recommendation Updates Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative pl-6">
                <div className="absolute left-2 top-0 bottom-0 w-px bg-border" />
                <ul className="space-y-5">
                  {timeline.map((t, i) => {
                    const dot =
                      t.tone === "success"
                        ? "bg-emerald-500"
                        : t.tone === "warning"
                        ? "bg-amber-500"
                        : "bg-primary";
                    const Icon =
                      t.tone === "success"
                        ? TrendingUp
                        : t.tone === "warning"
                        ? TrendingDown
                        : Sparkles;
                    return (
                      <li key={i} className="relative">
                        <span
                          className={cn(
                            "absolute -left-[18px] top-1.5 h-3 w-3 rounded-full ring-4 ring-background",
                            dot
                          )}
                        />
                        <div className="rounded-lg border border-border bg-card p-3 transition-all hover:border-primary/40 hover:shadow-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-muted-foreground">
                              {t.week}
                            </span>
                            <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                          <p className="text-sm text-foreground mt-1">{t.text}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default StudentInsights;