import { Activity } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { burnoutStyle } from "@/lib/status";
import { cn } from "@/lib/utils";
import type { BurnoutStatus } from "@/lib/types";

const LEVEL_ORDER = ["Safe", "Low Risk", "Medium Risk", "High Risk"] as const;

export function BurnoutRiskCard({ burnout }: { burnout: BurnoutStatus }) {
  const style = burnoutStyle(burnout.level);
  const activeIndex = LEVEL_ORDER.indexOf(burnout.level);

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Activity className={cn("h-5 w-5", style.text)} />
          <CardTitle>Burnout Risk</CardTitle>
        </div>
        <CardDescription>Based on total study time across all courses</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <Badge variant={style.variant} className="w-fit text-sm">
          {burnout.level}
        </Badge>

        {/* Four-segment level meter */}
        <div className="flex gap-1.5">
          {LEVEL_ORDER.map((level, i) => (
            <div
              key={level}
              className={cn(
                "h-2 flex-1 rounded-full",
                i <= activeIndex ? style.bg : "bg-muted",
              )}
            />
          ))}
        </div>

        <p className="text-sm text-muted-foreground">{burnout.message}</p>
      </CardContent>
    </Card>
  );
}
