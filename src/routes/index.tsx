import { createFileRoute, Link } from "@tanstack/react-router";
import {
  QrCode,
  Package,
  LineChart,
  Users,
  Sparkles,
  Wallet,
  ArrowRight,
  Check,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Gestto — Gestão completa para o seu negócio" },
      {
        name: "description",
        content:
          "Vendas com PIX e cartão, estoque, financeiro e equipe em um só app. Teste grátis por 2 dias. R$ 69,99 no primeiro mês.",
      },
      { property: "og:title", content: "Gestto — Gestão completa para o seu negócio" },
      {
        property: "og:description",
        content: "PIX, cartão, estoque, financeiro e equipe no celular. Teste grátis por 2 dias.",
      },
    ],
  }),
  component: Landing,
});

const modules = [
  { icon: QrCode, title: "Vendas", text: "QR Code PIX, cartão com parcelas, comanda e metas por vendedor." },
  { icon: Package, title: "Estoque", text: "Custo, margem, mínimo/máximo, validade e ficha técnica." },
  { icon: Wallet, title: "Financeiro", text: "Contas, folha, fluxo de caixa, DRE e simulador de imposto." },
  { icon: LineChart, title: "Dashboard", text: "Lucro líquido real já descontando a taxa da maquininha." },
  { icon: Users, title: "Equipe", text: "Ponto pelo celular, checklists, auditoria e permissões." },
  { icon: Sparkles, title: "IA embutida", text: "Insights de estoque e vendas e respostas sobre o seu negócio." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2">
          <div
            className="flex size-8 items-center justify-center rounded-lg font-display font-bold text-primary-foreground"
            style={{ background: "var(--gradient-brand)" }}
          >
            G
          </div>
          <span className="font-display text-xl font-bold">Gestto</span>
        </div>
        <Button asChild variant="ghost">
          <Link to="/auth">Entrar</Link>
        </Button>
      </header>

      <section className="mx-auto max-w-6xl px-5 pt-8 pb-16 lg:pt-16">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-primary">
              <ShieldCheck className="size-3.5" /> Feito para o empreendedor brasileiro
            </span>
            <h1 className="mt-5 text-4xl leading-[1.05] font-bold sm:text-6xl">
              Sua empresa inteira
              <br />
              na palma da mão.
            </h1>
            <p className="mt-5 max-w-lg text-lg text-muted-foreground">
              Receba no PIX e no cartão, controle estoque, veja o lucro real já descontando a maquininha e
              gerencie sua equipe — tudo em um só lugar.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="gap-2">
                <Link to="/auth">
                  Começar teste grátis <ArrowRight className="size-4" />
                </Link>
              </Button>
              <p className="text-sm text-muted-foreground">
                2 dias grátis · <span className="num">R$ 69,99</span> no 1º mês
              </p>
            </div>
          </div>

          <div className="surface p-6">
            <p className="text-sm text-muted-foreground">Faturamento hoje</p>
            <p className="num mt-1 text-4xl font-semibold">R$ 4.280,00</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-success-soft p-4">
                <p className="text-xs text-muted-foreground">Lucro líquido</p>
                <p className="num mt-1 text-xl font-semibold">R$ 1.712,40</p>
              </div>
              <div className="rounded-xl bg-warning-soft p-4">
                <p className="text-xs text-muted-foreground">Taxa maquininha</p>
                <p className="num mt-1 text-xl font-semibold">R$ 137,90</p>
              </div>
            </div>
            <div className="mt-3 space-y-2">
              {[
                ["PIX · Ana", "R$ 89,90"],
                ["Crédito 3x · Bruno", "R$ 340,00"],
                ["Débito · Ana", "R$ 52,00"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <span className="text-muted-foreground">{label}</span>
                  <span className="num font-medium">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-card">
        <div className="mx-auto grid max-w-6xl gap-4 px-5 py-14 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((m) => (
            <div key={m.title} className="rounded-xl border border-border p-5">
              <m.icon className="size-5 text-primary" />
              <h3 className="mt-3 text-lg font-semibold">{m.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{m.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-md px-5 py-16">
        <div className="surface p-7 text-center">
          <h2 className="text-2xl font-bold">Um plano, tudo liberado</h2>
          <p className="num mt-4 text-5xl font-bold text-primary">R$ 69,99</p>
          <p className="mt-1 text-sm text-muted-foreground">
            no primeiro mês, depois <span className="num">R$ 99,99</span>/mês
          </p>
          <ul className="mt-6 space-y-2 text-left text-sm">
            {[
              "Todos os módulos e usuários",
              "Multiempresa e múltiplas filiais",
              "Permissões por módulo e auditoria",
              "2 dias de teste grátis, sem cartão",
            ].map((i) => (
              <li key={i} className="flex items-center gap-2">
                <Check className="size-4 text-success" /> {i}
              </li>
            ))}
          </ul>
          <Button asChild size="lg" className="mt-6 w-full">
            <Link to="/auth">Criar minha conta</Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        Gestto · Gestão empresarial para pequenos, médios e grandes negócios.
      </footer>
    </div>
  );
}
