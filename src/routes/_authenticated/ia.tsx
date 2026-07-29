import { createFileRoute } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export const Route = createFileRoute("/_authenticated/ia")({
  head: () => ({
    meta: [
      { title: "IA — Gestto" },
      { name: "description", content: "Insights automáticos de estoque e vendas e consultas em linguagem natural." },
      { property: "og:title", content: "IA — Gestto" },
      { property: "og:description", content: "Pergunte sobre seu negócio e receba insights automáticos." },
    ],
  }),
  component: () => (
    <ComingSoon
      icon={Sparkles}
      title="IA do Gestto"
      description="Chat para dúvidas de gestão, tributação e precificação, insights automáticos sobre estoque e vendas, consultas em linguagem natural sobre os dados do negócio e previsão de vendas."
      items={["Chat de gestão e tributação", "Insights de estoque e vendas", "Consultas em linguagem natural", "Previsão de vendas"]}
    />
  ),
});
