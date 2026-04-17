import { AlertTriangle, CheckCircle2, Trophy, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

type OverallStatus = "At Risk" | "Good" | "Perfect";
type CourseStatus = "Bad" | "Average" | "Good";

interface StatusBadgeProps {
  status: OverallStatus | CourseStatus;
  type?: "overall" | "course";
}

const StatusBadge = ({ status, type = "overall" }: StatusBadgeProps) => {
  const getStatusConfig = () => {
    if (type === "overall") {
      switch (status) {
        case "At Risk":
          return {
            icon: AlertTriangle,
            bgColor: "bg-destructive/10",
            textColor: "text-destructive",
            borderColor: "border-destructive/30",
            message: "Your overall performance needs attention. Consider reaching out to your instructors.",
          };
        case "Good":
          return {
            icon: TrendingUp,
            bgColor: "bg-amber-500/10",
            textColor: "text-amber-600",
            borderColor: "border-amber-500/30",
            message: "You're doing well! Keep up the good work to reach excellence.",
          };
        case "Perfect":
          return {
            icon: Trophy,
            bgColor: "bg-emerald-500/10",
            textColor: "text-emerald-600",
            borderColor: "border-emerald-500/30",
            message: "Excellent performance! You're among the top students.",
          };
        default:
          return {
            icon: Minus,
            bgColor: "bg-muted",
            textColor: "text-muted-foreground",
            borderColor: "border-border",
            message: "Status unavailable.",
          };
      }
    } else {
      switch (status) {
        case "Bad":
          return {
            icon: TrendingDown,
            bgColor: "bg-destructive/10",
            textColor: "text-destructive",
            borderColor: "border-destructive/30",
            message: "Performance below expectations. Consider seeking additional help.",
          };
        case "Average":
          return {
            icon: Minus,
            bgColor: "bg-amber-500/10",
            textColor: "text-amber-600",
            borderColor: "border-amber-500/30",
            message: "Average performance. There's room for improvement.",
          };
        case "Good":
          return {
            icon: CheckCircle2,
            bgColor: "bg-emerald-500/10",
            textColor: "text-emerald-600",
            borderColor: "border-emerald-500/30",
            message: "Great performance in this course!",
          };
        default:
          return {
            icon: Minus,
            bgColor: "bg-muted",
            textColor: "text-muted-foreground",
            borderColor: "border-border",
            message: "Status unavailable.",
          };
      }
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className={cn(
      "rounded-xl border p-6",
      config.bgColor,
      config.borderColor
    )}>
      <div className="flex items-center gap-3 mb-3">
        <div className={cn(
          "flex h-12 w-12 items-center justify-center rounded-full",
          config.bgColor
        )}>
          <Icon className={cn("h-6 w-6", config.textColor)} />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Performance Status</p>
          <p className={cn("text-xl font-bold", config.textColor)}>{status}</p>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">{config.message}</p>
    </div>
  );
};

export default StatusBadge;
