import { Badge } from "@/components/ui/badge";

export type SupportStatus = "open" | "in_progress" | "resolved" | "closed";

export const SUPPORT_CATEGORIES = [
  "Dúvida sobre cobrança",
  "Problema técnico/bug",
  "Dúvida de uso",
  "Sugestão",
  "Cancelamento",
  "Outro",
] as const;

const STATUS_LABELS: Record<SupportStatus, string> = {
  open: "Aguardando resposta",
  in_progress: "Em andamento",
  resolved: "Resolvido",
  closed: "Fechado",
};

const STATUS_STYLES: Record<SupportStatus, string> = {
  open: "border-warning/30 bg-warning-soft text-warning-foreground",
  in_progress: "border-primary/20 bg-primary-soft text-primary",
  resolved: "border-success/30 bg-success-soft text-success",
  closed: "border-border bg-muted text-muted-foreground",
};

export function SupportStatusBadge({ status }: { status: SupportStatus }) {
  return (
    <Badge variant="outline" className={STATUS_STYLES[status]}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}
