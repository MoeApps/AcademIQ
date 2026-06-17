import { ArrowRight, CheckCircle2, TrendingUp } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { CounterfactualResponse } from "@/lib/types";

interface Props {
  data: CounterfactualResponse;
}

/** Format a 0–1 probability as a whole-number percentage. */
function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

/**
 * Counterfactual Recommendation Engine card.
 *
 * Shows "what would need to change" for a student to flip from Not High
 * Performer to High Performer — a what-if projection from the trained
 * model, never a guarantee, and the card says so explicitly.
 */
export function CounterfactualCard({ data }: Props) {
  const alreadyHighPerformer = data.status === "Already classified as High Performer";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <CardTitle>What Would It Take?</CardTitle>
        </div>
        <CardDescription>
          A what-if projection from the model — not a guarantee. Shows the
          smallest behavioural changes that would move your classification.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {alreadyHighPerformer ? (
          <div className="flex items-center gap-2 rounded-lg border border-success/20 bg-success/5 p-4">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
            <p className="text-sm font-medium text-foreground">
              Already High Performer ✅ — no changes needed right now.
            </p>
          </div>
        ) : (
          <>
            {/* Current → projected probability, with a visual delta */}
            <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 p-4">
              <div className="text-center">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Current
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {pct(data.originalProbability)}
                </p>
              </div>

              <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground" />

              <div className="text-center">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Projected
                </p>
                <p className="text-2xl font-bold text-primary">
                  {pct(data.newProbability)}
                </p>
              </div>

              <Badge
                variant={data.probabilityGain > 0 ? "success" : "muted"}
                className="ml-auto shrink-0"
              >
                +{pct(data.probabilityGain)}
              </Badge>
            </div>

            {/* What would need to change */}
            {data.changesNeeded.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                The model couldn't identify a clear set of changes from your
                current data. Try syncing more recent activity first.
              </p>
            ) : (
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  What would need to change
                </p>
                {data.changesNeeded.map((change) => (
                  <div
                    key={change.feature}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background p-3"
                  >
                    <p className="text-sm font-medium text-foreground">
                      {change.friendlyLabel}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{Math.round(change.from * 10) / 10}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                      <span className="font-semibold text-foreground">
                        {Math.round(change.to * 10) / 10}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <p className="text-xs italic text-muted-foreground/80">
              This is a what-if projection based on patterns in past student
              data — it estimates direction and scale, not a guaranteed
              outcome for you specifically.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
