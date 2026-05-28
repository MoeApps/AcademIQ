"use client";

import { Check, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { QuizQuestion } from "@/lib/types";

interface Props {
  question: QuizQuestion;
  /** 1-based position, shown before the question text. */
  number: number;
  /** Currently chosen option index, or undefined if unanswered. */
  selectedIndex?: number;
  /** Once submitted, choices lock and correctness is revealed. */
  submitted: boolean;
  onSelect: (optionIndex: number) => void;
}

/** A single quiz question rendered as a self-contained, stacked card. */
export function QuizQuestionCard({
  question,
  number,
  selectedIndex,
  submitted,
  onSelect,
}: Props) {
  return (
    <Card>
      <CardContent className="space-y-4 p-5 sm:p-6">
        <p className="font-medium text-foreground">
          <span className="mr-2 text-muted-foreground">{number}.</span>
          {question.question}
        </p>

        <div
          role="radiogroup"
          aria-label={`Question ${number}`}
          className="grid gap-2"
        >
          {question.options.map((option, oi) => {
            const selected = selectedIndex === oi;
            const isCorrect = oi === question.correctIndex;
            const showCorrect = submitted && isCorrect;
            const showWrong = submitted && selected && !isCorrect;

            return (
              <button
                key={oi}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onSelect(oi)}
                disabled={submitted}
                className={cn(
                  "flex items-center justify-between rounded-lg border px-4 py-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-default",
                  showCorrect && "border-success bg-success/10 text-success",
                  showWrong && "border-destructive bg-destructive/10 text-destructive",
                  !submitted &&
                    (selected
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-accent"),
                  submitted && !showCorrect && !showWrong && "border-border",
                )}
              >
                <span>{option}</span>
                {showCorrect && <Check className="h-4 w-4 shrink-0" />}
                {showWrong && <X className="h-4 w-4 shrink-0" />}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
