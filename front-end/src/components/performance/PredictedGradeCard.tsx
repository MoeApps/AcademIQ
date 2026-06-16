import { Target } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface PredictedGradeCardProps {
  /** Predicted grade 0-100, or null when no data is available yet. */
  grade: number | null;
}

export function PredictedGradeCard({ grade }: PredictedGradeCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          <CardTitle>Predicted Grade</CardTitle>
        </div>
        <CardDescription>
          {grade !== null
            ? "Based on your current course average"
            : "Predicted grade"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {grade !== null ? (
          <>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold text-foreground">
                {grade.toFixed(0)}
              </span>
              <span className="text-lg text-muted-foreground">/ 100</span>
            </div>
            <Progress value={grade} />
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            No graded items available for this course yet. Grades will appear
            here after your first submission is marked.
          </p>
        )}
      </CardContent>
    </Card>
  );
}