import { AlertCircle } from "lucide-react";

export function ApiErrorAlert({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="space-y-2">
        <p>{message}</p>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="font-medium underline underline-offset-2"
          >
            Try again
          </button>
        ) : null}
      </div>
    </div>
  );
}
