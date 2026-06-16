import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface CourseAverageCardProps {
  /** Actual current average (0-100). Zero means no graded items yet. */
  courseAverage: number;
  /** Predicted grade (0-100), or null when unavailable. */
  predictedGrade: number | null;
}

export function CourseAverageCard({ courseAverage, predictedGrade }: CourseAverageCardProps) {
  const hasAverage  = courseAverage > 0;
  const hasPredicted = predictedGrade !== null && predictedGrade > 0;

  const deltaLabel = (() => {
    if (!hasAverage || !hasPredicted) return null;
    const delta = predictedGrade - courseAverage;
    if (Math.abs(delta) < 0.5) return "Prediction matches your current average.";
    return delta > 0
      ? `Model expects a ${delta.toFixed(1)}-pt improvement on your current average.`
      : `Model expects a ${Math.abs(delta).toFixed(1)}-pt drop from your current average.`;
  })();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Course Average</CardTitle>
        <CardDescription>
          Your actual average across all graded Moodle tasks in this course
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {hasAverage ? (
          <>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold text-foreground">
                {courseAverage.toFixed(1)}
              </span>
              <span className="text-lg text-muted-foreground">/ 100</span>
            </div>
            <Progress value={courseAverage} indicatorClassName="bg-muted-foreground" />
            {deltaLabel && (
              <p className="text-sm text-muted-foreground">{deltaLabel}</p>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            No graded items recorded for this course yet. Your average will
            appear here after grades are published on Moodle.
          </p>
        )}
      </CardContent>
    </Card>
  );
}