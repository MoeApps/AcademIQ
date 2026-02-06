import DashboardHeader from "@/components/dashboard/DashboardHeader";
import Footer from "@/components/layout/Footer";
import PerformanceChart from "@/components/dashboard/PerformanceChart";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { weeklyPerformanceData, getOverallStatus } from "@/data/mockData";

const StudentDashboard = () => {
  // Calculate average score from weekly data
  const avgScore = weeklyPerformanceData.reduce((sum, d) => sum + d.score, 0) / weeklyPerformanceData.length;
  const overallStatus = getOverallStatus(avgScore);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <DashboardHeader username="Khaled" />
      
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
      </main>

      <Footer />
    </div>
  );
};

export default StudentDashboard;
