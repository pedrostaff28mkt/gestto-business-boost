import { createFileRoute } from "@tanstack/react-router";
import { Wallet } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export const Route = createFileRoute("/_authenticated/financeiro")({
  head: () => ({
    meta: [
      { title: "Financeiro — Gestto" },
      { name: "description", content: "Contas a pagar e receber, folha, fluxo de caixa e DRE simplificado." },
      { property: "og:title", content: "Financeiro — Gestto" },
      { property: "og:description", content: "Fluxo de caixa, DRE e simulador de imposto do seu negócio." },
    ],
  }),
  component: () => (
    <ComingSoon
      icon={Wallet}
      title="Financeiro"
      description="Gastos fixos, folha (diarista e CLT), contas a pagar/receber com lembretes, fluxo de caixa, DRE simplificado e simulador de Simples Nacional/MEI."
      items={["Contas a pagar e receber", "Folha de pagamento", "Fluxo de caixa e DRE", "Simulador de imposto"]}
    />
  ),
});
