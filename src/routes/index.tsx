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
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { testimonials } from "@/lib/testimonials";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Gestto Beta — Clareza para gerir o seu negócio" },
      {
        name: "description",
        content:
          "Veja o que entra, o que sai e quanto sobra de verdade. Vendas no PIX e cartão, estoque e equipe num só lugar. 2 dias grátis, R$ 69,99 no 1º mês.",
      },
      { property: "og:title", content: "Gestto Beta — Clareza para gerir o seu negócio" },
      {
        property: "og:description",
        content:
          "Saiba todos os dias quanto vendeu, quanto sobrou e o que precisa da sua atenção. Teste grátis por 2 dias.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const modules = [
  { icon: QrCode, title: "Vendas", text: "Receba no PIX na hora ou no cartão parcelado, com meta clara para cada vendedor." },
  { icon: Package, title: "Estoque", text: "Saiba o que está acabando, o que vence e quanto cada produto realmente custa." },
  { icon: Wallet, title: "Financeiro", text: "Contas a pagar, folha e fluxo de caixa sem planilha e sem susto no fim do mês." },
  { icon: LineChart, title: "Dashboard", text: "O lucro que sobra de verdade, já com a taxa da maquininha descontada." },
  { icon: Users, title: "Equipe", text: "Ponto pelo celular, tarefas do dia e cada pessoa vendo só o que precisa ver." },
  { icon: Sparkles, title: "IA embutida", text: "Respostas simples sobre o seu negócio e avisos do que merece atenção agora." },
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

      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="surface p-7 text-center lg:p-10">
          <span className="inline-flex items-center rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-primary">
            Plano Gestto Beta
          </span>
          <h2 className="mt-4 text-2xl font-bold lg:text-3xl">Um plano, tudo liberado</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Acesso completo a todos os módulos — hoje e no que estiver por vir.
          </p>

          <div className="mt-6">
            <p className="num text-5xl font-bold text-primary">R$ 69,99</p>
            <p className="mt-1 text-sm text-muted-foreground">
              no primeiro mês, depois <span className="num">R$ 99,99</span>/mês
            </p>
            <p className="mt-3 text-sm font-medium text-foreground">
              Menos que um almoço executivo por mês para cuidar da empresa inteira.
            </p>
          </div>

          <ul className="mt-8 grid gap-3 text-left text-sm sm:grid-cols-2">
            {[
              "Vendas: PIX na hora e cartão parcelado, direto do celular",
              "Estoque: controle de mínimo, validade e ficha técnica de produção",
              "Equipe: convite de funcionário com permissão sob medida, ponto pelo celular",
              "Multiempresa e múltiplas filiais",
              "Auditoria completa de cada ação da equipe",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-success" />
                <span>{item}</span>
              </li>
            ))}
            {[
              "Financeiro: contas, folha de pagamento e fluxo de caixa",
              "CRM: histórico de clientes e fidelização",
              "IA embutida: insights automáticos e respostas sobre o seu negócio",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <Clock className="mt-0.5 size-4 shrink-0 text-warning" />
                <span className="flex flex-wrap items-center gap-1.5">
                  {item}
                  <span className="inline-flex items-center gap-1 rounded-md bg-warning-soft px-1.5 py-0.5 text-xs font-medium text-warning-foreground">
                    <Sparkles className="size-3" /> Em breve
                  </span>
                </span>
              </li>
            ))}
          </ul>

          <p className="mt-6 text-sm text-muted-foreground">
            Novos módulos incluídos automaticamente na sua assinatura, sem custo extra.
          </p>

          <Button asChild size="lg" className="mt-6 w-full">
            <Link to="/auth">Criar minha conta</Link>
          </Button>

          <p className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5" />
            2 dias grátis, sem cartão · cancele quando quiser, sem multa
          </p>
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        <p>Gestto · Gestão empresarial para pequenos, médios e grandes negócios.</p>
        <nav className="mt-3 flex justify-center gap-5">
          <Link to="/termos" className="hover:text-foreground">
            Termos de Uso
          </Link>
          <Link to="/privacidade" className="hover:text-foreground">
            Política de Privacidade
          </Link>
        </nav>
      </footer>
    </div>
  );
}
