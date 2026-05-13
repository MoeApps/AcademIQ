import DashboardHeader from "@/components/dashboard/DashboardHeader";
import Footer from "@/components/layout/Footer";
import PerformanceChart from "@/components/dashboard/PerformanceChart";
import StatusBadge from "@/components/dashboard/StatusBadge";
import CoursePredictedGrades from "@/components/dashboard/CoursePredictedGrades";
import StudyPatternCard from "@/components/dashboard/StudyPatternCard";
import { weeklyPerformanceData, getOverallStatus } from "@/data/mockData";
import { useUser } from "@/context/UserContext";

const StudentDashboard = () => {
  const { username } = useUser();
  const avgScore = weeklyPerformanceData.reduce((sum, d) => sum + d.score, 0) / weeklyPerformanceData.length;
  const overallStatus = getOverallStatus(avgScore);
  const engagement = [
    { day: "Mon", hours: 2.1 },
    { day: "Tue", hours: 2.4 },
    { day: "Wed", hours: 2.0 },
    { day: "Thu", hours: 6.8 },
    { day: "Fri", hours: 7.2 },
    { day: "Sat", hours: 1.5 },
    { day: "Sun", hours: 1.8 },
  ];
  const burnoutRisk =
    Math.max(...engagement.map((e) => e.hours)) >
    (engagement.reduce((s, e) => s + e.hours, 0) / engagement.length) * 2;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <DashboardHeader username={username || "Student"} />
      
      <main className="container flex-1 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Student Dashboard</h1>
          <p className="text-muted-foreground">Track your academic progress across all courses.</p>
        </div>

        {/* Performance Overview */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <PerformanceChart 
              data={weeklyPerformanceData} 
              title="Weekly Performance Overview" 
            />
          </div>
          <div className="lg:col-span-1">
            <StatusBadge status={overallStatus} type="overall" />
            
            {/* Quick Stats */}
            <div className="mt-6 rounded-xl border border-border bg-card p-6">
              <h3 className="mb-4 text-lg font-semibold text-card-foreground">Quick Stats</h3>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Average Score</span>
                  <span className="font-bold text-card-foreground">{avgScore.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Enrolled Courses</span>
                  <span className="font-bold text-card-foreground">6</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pending Tasks</span>
                  <span className="font-bold text-card-foreground">8</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Upcoming Quizzes</span>
                  <span className="font-bold text-card-foreground">3</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Predicted Grade per Course */}
        <div className="mt-6">
          <CoursePredictedGrades />
        </div>

        {/* Study Pattern Analysis */}
        <div className="mt-6">
          <StudyPatternCard data={engagement} burnoutRisk={burnoutRisk} />
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default StudentDashboard;
