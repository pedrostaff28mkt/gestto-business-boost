import { AlertTriangle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function QueryError({
  message = "Não foi possível carregar a equipe",
  error,
  onRetry,
  retrying,
}: {
  message?: string;
  error?: unknown;
  onRetry: () => void;
  retrying?: boolean;
}) {
  const detail = error instanceof Error ? error.message : error ? String((error as { message?: string }).message ?? "") : "";
  return (
    <div role="alert" className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm">
      <div className="flex min-w-0 items-start gap-2">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
        <div className="min-w-0">
          <p className="font-medium text-destructive">{message}</p>
          {detail && <p className="truncate text-xs text-muted-foreground">{detail}</p>}
        </div>
      </div>
      <Button size="sm" variant="outline" onClick={onRetry} disabled={retrying}>
        <RotateCw className={`size-4 ${retrying ? "animate-spin" : ""}`} /> Tentar novamente
      </Button>
    </div>
  );
}
