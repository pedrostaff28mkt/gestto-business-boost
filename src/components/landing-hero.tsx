import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Play,
  ShoppingCart,
  Wallet,
  Users,
  Clock,
  BarChart3,
  Sparkles,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";

/**
 * DADOS ILUSTRATIVOS (MOCK) — apenas para composição visual do hero.
 * Nenhum destes números vem do banco de dados nem representa dados reais de clientes.
 */
const mockRevenueTrend = [
  { v: 18 },
  { v: 24 },
  { v: 21 },
  { v: 32 },
  { v: 29 },
  { v: 41 },
  { v: 52 },
];

const mockOverview = [
  { label: "Receitas", value: "R$ 128.400" },
  { label: "Despesas", value: "R$ 74.910" },
  { label: "Lucro líquido", value: "R$ 53.490", positive: true },
  { label: "Margem de lucro", value: "41,6%" },
];

const mockChannels = [
  { name: "PIX", value: 48, fill: "var(--hero-accent)" },
  { name: "Cartão", value: 34, fill: "var(--success)" },
  { name: "Dinheiro", value: 18, fill: "var(--warning)" },
];

const mockCashFlow = [{ v: 12 }, { v: 20 }, { v: 16 }, { v: 26 }, { v: 22 }, { v: 31 }];

const heroModules = [
  { icon: ShoppingCart, label: "Vendas e Estoque" },
  { icon: Wallet, label: "Financeiro e PIX" },
  { icon: Users, label: "CRM e Clientes" },
  { icon: Clock, label: "Equipe e Ponto" },
  { icon: BarChart3, label: "Relatórios e Dashboards" },
  { icon: Sparkles, label: "IA Integrada" },
];

function GlassCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`hero-glass p-4 ${className}`}>{children}</div>;
}

export function LandingHero() {
  return (
    <section className="hero-dark relative overflow-hidden">
      <div className="relative mx-auto grid max-w-6xl gap-14 px-5 pt-12 pb-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:pt-20 lg:pb-28">
        <div>
          <h1 className="font-display text-4xl leading-[1.05] font-bold text-hero-foreground sm:text-6xl">
            Sua empresa toda,
            <br />
            <span className="text-hero-accent">sob controle.</span>
          </h1>

          <p className="mt-6 max-w-xl text-lg text-hero-muted">
            Gestão completa e inteligente para empresas que querem crescer com clareza, agilidade e{" "}
            <span className="font-medium text-hero-accent">decisões baseadas em dados</span>.
          </p>

          <ul className="mt-10 grid grid-cols-3 gap-x-4 gap-y-6 sm:grid-cols-6">
            {heroModules.map((m) => (
              <li key={m.label} className="flex flex-col items-center gap-2 text-center">
                <span className="hero-glass flex size-10 items-center justify-center rounded-xl">
                  <m.icon className="size-4 text-hero-accent" strokeWidth={1.75} />
                </span>
                <span className="text-[11px] leading-tight text-hero-muted">{m.label}</span>
              </li>
            ))}
          </ul>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Button asChild size="lg" className="gap-2">
              <Link to="/auth">
                Começar gratuitamente <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="ghost"
              className="gap-2 text-hero-foreground hover:bg-hero-glass hover:text-hero-foreground"
            >
              <a href="#modulos">
                <Play className="size-4" /> Ver como funciona
              </a>
            </Button>
          </div>
        </div>

        {/* Composição visual — todos os números abaixo são ilustrativos (mock) */}
        <div className="relative min-h-[520px] lg:min-h-[560px]">
          <GlassCard className="absolute top-0 left-0 w-[75%]">
            <p className="text-xs text-hero-muted">Faturamento</p>
            <div className="mt-1 flex items-end gap-2">
              <p className="num text-3xl font-semibold text-hero-foreground">R$ 128.400</p>
              <span className="num pb-1 text-xs font-medium text-success">+18,4%</span>
            </div>
            <div className="mt-3 h-16">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mockRevenueTrend}>
                  <defs>
                    <linearGradient id="heroRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--hero-accent)" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="var(--hero-accent)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="v"
                    stroke="var(--hero-accent)"
                    strokeWidth={2}
                    fill="url(#heroRevenue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>

          <GlassCard className="absolute top-[26%] right-0 w-[62%]">
            <p className="text-xs text-hero-muted">Visão geral</p>
            <div className="mt-3 space-y-2">
              {mockOverview.map((row) => (
                <div key={row.label} className="flex items-center justify-between text-xs">
                  <span className="text-hero-muted">{row.label}</span>
                  <span
                    className={`num font-medium ${row.positive ? "text-success" : "text-hero-foreground"}`}
                  >
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </GlassCard>

          <GlassCard className="absolute bottom-[10%] left-0 w-[54%]">
            <p className="text-xs text-hero-muted">Vendas por canal</p>
            <div className="mt-2 flex items-center gap-3">
              <div className="size-20 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={mockChannels}
                      dataKey="value"
                      innerRadius={22}
                      outerRadius={38}
                      paddingAngle={3}
                      stroke="none"
                    >
                      {mockChannels.map((c) => (
                        <Cell key={c.name} fill={c.fill} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="space-y-1 text-[11px]">
                {mockChannels.map((c) => (
                  <li key={c.name} className="flex items-center gap-2 text-hero-muted">
                    <span className="size-2 rounded-full" style={{ background: c.fill }} />
                    {c.name} <span className="num text-hero-foreground">{c.value}%</span>
                  </li>
                ))}
              </ul>
            </div>
          </GlassCard>

          <GlassCard className="absolute right-[6%] bottom-0 w-[46%]">
            <p className="text-xs text-hero-muted">Fluxo de caixa</p>
            <div className="mt-2 h-14">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mockCashFlow}>
                  <Bar dataKey="v" fill="var(--hero-accent)" radius={3} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>

          {/* Mockup de celular — ilustração de produto/roadmap, a IA em chat ainda não é uma
              funcionalidade ativa na aplicação. */}
          <div className="hero-phone absolute top-[34%] left-[26%] w-[46%] max-w-[210px] p-3">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-hero-glass-strong" />
            <div className="flex items-center gap-2">
              <span className="hero-glass flex size-7 items-center justify-center rounded-lg">
                <Sparkles className="size-3.5 text-hero-accent" />
              </span>
              <p className="text-xs font-semibold text-hero-foreground">Gestto IA</p>
            </div>
            <div className="mt-3 rounded-xl bg-hero-glass-strong p-2.5 text-[11px] leading-snug text-hero-foreground">
              Olá, Pedro! Aqui está o resumo do seu negócio hoje.
            </div>
            <div className="mt-2 space-y-1.5">
              {[
                ["Vendas hoje", "R$ 4.280"],
                ["Lucro líquido", "R$ 1.712"],
                ["Estoque crítico", "3 itens"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between rounded-lg bg-hero-glass px-2.5 py-1.5 text-[11px]"
                >
                  <span className="text-hero-muted">{label}</span>
                  <span className="num font-medium text-hero-foreground">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
