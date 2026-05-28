import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface CourseAverageCardProps {
  /** Actual current average (0-100). */
  courseAverage: number;
  /** Predicted grade, shown as a comparison anchor. */
  predictedGrade: number;
}

export function CourseAverageCard({
  courseAverage,
  predictedGrade,
}: CourseAverageCardProps) {
  const delta = predictedGrade - courseAverage;
  const deltaLabel =
    delta === 0
      ? "Prediction matches your current average."
      : delta > 0
        ? `Predicted to rise ${delta.toFixed(1)} pts above your current average.`
        : `Predicted to fall ${Math.abs(delta).toFixed(1)} pts below your current average.`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Course Average</CardTitle>
        <CardDescription>
          Your actual average across all graded Moodle tasks in this course
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold text-foreground">
            {courseAverage.toFixed(1)}
          </span>
          <span className="text-lg text-muted-foreground">/ 100</span>
        </div>
        <Progress value={courseAverage} indicatorClassName="bg-muted-foreground" />
        <p className="text-sm text-muted-foreground">{deltaLabel}</p>
      </CardContent>
    </Card>
  );
}
