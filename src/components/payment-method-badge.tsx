import { QrCode, CreditCard, Banknote, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

type MethodKey = "pix" | "card_credit" | "card_debit" | "cash" | string;

export const methodMeta = (method: MethodKey) => {
  switch (method) {
    case "pix":
      return { label: "PIX", icon: QrCode, tint: "bg-primary/10 text-primary", chart: "var(--chart-1)" };
    case "card_credit":
      return { label: "Crédito", icon: CreditCard, tint: "bg-chart-4/10 text-chart-4", chart: "var(--chart-4)" };
    case "card_debit":
      return { label: "Débito", icon: Wallet, tint: "bg-chart-5/15 text-muted-foreground", chart: "var(--chart-5)" };
    case "cash":
      return { label: "Dinheiro", icon: Banknote, tint: "bg-success-soft text-success", chart: "var(--chart-2)" };
    default:
      return { label: "Cartão", icon: CreditCard, tint: "bg-chart-4/10 text-chart-4", chart: "var(--chart-4)" };
  }
};

/** Ícone circular colorido por forma de pagamento (uso compartilhado Dashboard/Vendas). */
export function MethodIcon({ method, className }: { method: MethodKey; className?: string }) {
  const meta = methodMeta(method);
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-full",
        meta.tint,
        className,
      )}
    >
      <Icon className="size-4" />
    </span>
  );
}
