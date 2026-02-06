import { useState, useMemo } from "react";
import { useParams, Navigate } from "react-router-dom";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import Footer from "@/components/layout/Footer";
import PerformanceChart from "@/components/dashboard/PerformanceChart";
import StatusBadge from "@/components/dashboard/StatusBadge";
import CourseStatistics from "@/components/dashboard/CourseStatistics";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  courses,
  coursePerformanceData,
  courseStats,
  getCourseStatus,
} from "@/data/mockData";

const CoursePage = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState("all");

  // Find the course
  const course = courses.find((c) => c.id === courseId);

  // If course not found, redirect to dashboard
  if (!course || !courseId) {
    return <Navigate to="/dashboard" replace />;
  }

  const performanceData = coursePerformanceData[courseId] || [];
  const stats = courseStats[courseId];

  // Filter data based on date range
  const filteredData = useMemo(() => {
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

  // Calculate average and status
  const avgScore = filteredData.reduce((sum, d) => sum + d.score, 0) / filteredData.length;
  const courseStatus = getCourseStatus(avgScore);

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
      <DashboardHeader username="Khaled" />

      <main className="container flex-1 py-8">
        {/* Course Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <span>{course.code}</span>
            <span>•</span>
            <span>{course.instructor}</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground">{course.name}</h1>
        </div>

        {/* Performance Section */}
        <div className="grid gap-6 lg:grid-cols-3 mb-8">
          <div className="lg:col-span-2">
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                <h3 className="text-lg font-semibold text-card-foreground">
                  Course Performance
                </h3>
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
              <h3 className="mb-4 text-lg font-semibold text-card-foreground">
                Course Average
              </h3>
              <div className="text-center">
                <span className="text-4xl font-bold text-primary">
                  {avgScore.toFixed(1)}%
                </span>
                <p className="text-sm text-muted-foreground mt-1">
                  Based on {filteredData.length} week(s) of data
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
