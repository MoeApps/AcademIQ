import { FileText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import type { LearningMaterial } from "@/lib/types";

interface MaterialSelectProps {
  materials: LearningMaterial[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}

export function MaterialSelect({
  materials,
  selectedIds,
  onToggle,
}: MaterialSelectProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Select Learning Materials</CardTitle>
        <CardDescription>
          The quiz is generated strictly from the materials you tick below.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {materials.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No learning materials found for this course.
          </p>
        ) : (
          materials.map((material) => {
            const checked = selectedIds.includes(material.id);
            return (
              <label
                key={material.id}
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-background p-3 transition-colors hover:bg-accent has-[:checked]:border-primary/50"
              >
                <Checkbox
                  checked={checked}
                  onChange={() => onToggle(material.id)}
                />
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="flex-1 text-sm font-medium text-foreground">
                  {material.title}
                </span>
                <Badge variant="muted">{material.kind}</Badge>
              </label>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
