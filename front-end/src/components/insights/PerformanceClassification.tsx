import { CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Props {
  isHighPerformer: boolean;
  summary: string;
}

export function PerformanceClassification({ isHighPerformer, summary }: Props) {
  const Icon = isHighPerformer ? CheckCircle2 : AlertCircle;
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Icon
            className={isHighPerformer ? "h-5 w-5 text-success" : "h-5 w-5 text-warning"}
          />
          <CardTitle>Performance Classification</CardTitle>
        </div>
        <CardDescription>How the AI analysis classifies you in this course</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Badge variant={isHighPerformer ? "success" : "warning"} className="text-sm">
          {isHighPerformer ? "High Performer" : "Not a High Performer"}
        </Badge>
        <p className="text-sm text-muted-foreground">{summary}</p>
      </CardContent>
    </Card>
  );
}
