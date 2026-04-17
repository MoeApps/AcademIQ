import { FileText, HelpCircle, Clock } from "lucide-react";
import { CourseStats } from "@/data/mockData";

interface CourseStatisticsProps {
  stats: CourseStats;
}

const CourseStatistics = ({ stats }: CourseStatisticsProps) => {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h3 className="mb-6 text-lg font-semibold text-card-foreground">Course Statistics</h3>
      
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Assignments */}
        <div className="rounded-lg bg-secondary/50 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <span className="font-medium text-card-foreground">Assignments</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Submitted</span>
              <span className="font-semibold text-card-foreground">
                {stats.submittedAssignments} / {stats.totalAssignments}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Average Grade</span>
              <span className="font-semibold text-card-foreground">{stats.avgAssignmentGrade}%</span>
            </div>
          </div>
        </div>

        {/* Quizzes */}
        <div className="rounded-lg bg-secondary/50 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <HelpCircle className="h-5 w-5 text-primary" />
            </div>
            <span className="font-medium text-card-foreground">Quizzes</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Completed</span>
              <span className="font-semibold text-card-foreground">
                {stats.completedQuizzes} / {stats.totalQuizzes}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Average Grade</span>
              <span className="font-semibold text-card-foreground">{stats.avgQuizGrade}%</span>
            </div>
          </div>
        </div>

        {/* Time Spent */}
        <div className="rounded-lg bg-secondary/50 p-4 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <span className="font-medium text-card-foreground">Time Spent</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Hours</span>
              <span className="font-semibold text-card-foreground">{stats.timeSpentHours}h</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Weekly Avg</span>
              <span className="font-semibold text-card-foreground">
                {(stats.timeSpentHours / 6).toFixed(1)}h
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseStatistics;
