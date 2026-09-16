import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Trophy,
  Medal,
  AlertTriangle,
  Target,
  Percent,
  Wallet,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  PackageSearch,
  Receipt,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useGestto } from "@/hooks/use-gestto";
import { brl, num, shortDate } from "@/lib/format";
import { LockedArea, BlurredValue, UnlockHint } from "@/components/paywall";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import { MethodIcon, methodMeta } from "@/components/payment-method-badge";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Gestto" },
      { name: "description", content: "Vendas do dia, lucro líquido real e desempenho por vendedor." },
      { property: "og:title", content: "Dashboard — Gestto" },
      { property: "og:description", content: "Acompanhe vendas, lucro líquido e ranking de produtos." },
    ],
  }),
  component: DashboardPage,
});

type SaleRow = {
  id: string;
  created_at: string;
  method: string;
  gross_amount: number;
  fee_amount: number;
  net_amount: number;
  seller_id: string;
};

function Stat({
  label,
  value,
  hint,
  tone = "default",
  teaser = false,
  gradient = false,
  trend,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "success" | "warning";
  /** Valor premium: fica borrado mesmo durante o teste grátis. */
  teaser?: boolean;
  /** Destaque com gradiente sutil no número principal. */
  gradient?: boolean;
  trend?: number;
  icon: typeof TrendingUp;
}) {
  const toneClass =
    tone === "success"
      ? "bg-success-soft text-success"
      : tone === "warning"
        ? "bg-warning-soft text-warning-foreground"
        : "bg-primary/10 text-primary";
  const TrendIcon = trend !== undefined && trend < 0 ? ArrowDownRight : ArrowUpRight;
  return (
    <div className="surface group relative overflow-hidden p-4 transition-shadow hover:shadow-lg">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <span className={`flex size-11 shrink-0 items-center justify-center rounded-full ${toneClass}`}>
          <Icon className="size-5" />
        </span>
      </div>
      <p
        className={`num mt-3 text-[1.75rem] leading-tight font-bold tracking-tight ${
          gradient ? "bg-gradient-to-r from-primary to-chart-4 bg-clip-text text-transparent" : ""
        }`}
      >
        <BlurredValue teaser={teaser}>{value}</BlurredValue>
      </p>
      <div className="mt-1 flex items-center gap-1.5">
        {trend !== undefined && (
          <span
            className={`flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[0.6875rem] font-semibold ${
              trend < 0 ? "bg-warning-soft text-warning-foreground" : "bg-success-soft text-success"
            }`}
          >
            <TrendIcon className="size-3" />
            {`${trend >= 0 ? "+" : ""}${num(trend, 1)}%`}
          </span>
        )}
        {hint && (
          <p className="text-xs text-muted-foreground">
            <BlurredValue teaser={teaser}>{hint}</BlurredValue>
          </p>
        )}
      </div>
    </div>
  );
}

function DashboardPage() {
  const { session, isLoading } = useGestto();
  const navigate = useNavigate();
  const companyId = session?.companyId;
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Dono que ainda não respondeu o quiz de perfil vai para o onboarding.
  useEffect(() => {
    if (isLoading || !session) return;
    if (session.role === "owner" && !session.quizCompletedAt) {
      navigate({ to: "/onboarding", replace: true });
    }
  }, [isLoading, session, navigate]);

  const { data } = useQuery({
    queryKey: ["dashboard", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - 60);
      const [{ data: sales }, { data: products }] = await Promise.all([
        supabase
          .from("sales")
          .select("id, created_at, method, gross_amount, fee_amount, net_amount, seller_id")
          .eq("company_id", companyId!)
          .gte("created_at", since.toISOString())
          .order("created_at", { ascending: false }),
        supabase
          .from("products")
          .select("id, name, stock_qty, min_stock")
          .eq("company_id", companyId!)
          .eq("active", true),
      ]);
      return { sales: (sales ?? []) as SaleRow[], products: products ?? [] };
    },
  });

  const sales = data?.sales ?? [];
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const start7 = new Date(Date.now() - 7 * 864e5);
  const start30 = new Date(Date.now() - 30 * 864e5);
  const prev30 = new Date(Date.now() - 60 * 864e5);

  const inRange = (from: Date, to?: Date) =>
    sales.filter((s) => {
      const t = new Date(s.created_at).getTime();
      return t >= from.getTime() && (!to || t < to.getTime());
    });

  const sum = (rows: SaleRow[], key: keyof SaleRow) =>
    rows.reduce((acc, r) => acc + Number(r[key] ?? 0), 0);

  const today = inRange(startOfDay);
  const week = inRange(start7);
  const month = inRange(start30);
  const lastMonth = inRange(prev30, start30);

  const monthGross = sum(month, "gross_amount");
  const lastGross = sum(lastMonth, "gross_amount");
  const variation = lastGross > 0 ? ((monthGross - lastGross) / lastGross) * 100 : 0;
  const terminalFee = session?.payment.terminalMonthlyFee ?? 0;
  const netProfit = sum(month, "net_amount") - terminalFee;

  const lowStock = (data?.products ?? []).filter(
    (p) => Number(p.stock_qty) <= Number(p.min_stock) && Number(p.min_stock) > 0,
  );

  const bySeller = Object.values(
    month.reduce<Record<string, { id: string; total: number; count: number }>>((acc, s) => {
      acc[s.seller_id] ??= { id: s.seller_id, total: 0, count: 0 };
      acc[s.seller_id].total += Number(s.gross_amount);
      acc[s.seller_id].count += 1;
      return acc;
    }, {}),
  ).sort((a, b) => b.total - a.total);

  const goal = session?.monthlyGoal ?? 0;
  const goalPct = goal > 0 ? Math.min(100, (monthGross / goal) * 100) : 0;

  // Evolução diária dos últimos 14 dias (agrupada no frontend a partir de `sales`).
  const daily = Array.from({ length: 14 }, (_, i) => {
    const day = new Date();
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - (13 - i));
    const next = new Date(day.getTime() + 864e5);
    const rows = sales.filter((s) => {
      const t = new Date(s.created_at).getTime();
      return t >= day.getTime() && t < next.getTime();
    });
    return {
      label: day.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      total: sum(rows, "gross_amount"),
    };
  });

  const methods = [
    { key: "pix" },
    { key: "card_credit" },
    { key: "card_debit" },
    { key: "cash" },
  ].map((m) => {
    const rows = month.filter((s) => s.method === m.key);
    const total = sum(rows, "gross_amount");
    const share = monthGross > 0 ? (total / monthGross) * 100 : 0;
    const meta = methodMeta(m.key);
    return { key: m.key, label: meta.label, color: meta.chart, total, share };
  });
  const donutData = methods.filter((m) => m.total > 0);

  const periodLabel = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-4">
      <div className="surface flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="flex items-center gap-3">
          <UserAvatar
            name={session?.fullName}
            avatarPath={session?.avatarUrl}
            className="size-12 ring-2 ring-primary/20"
          />
          <div>
            <h1 className="font-display text-2xl leading-tight font-bold tracking-tight">
              Olá, {session?.fullName.split(" ")[0]}
            </h1>
            <p className="text-sm text-muted-foreground">{session?.companyName}</p>
          </div>
        </div>
        <div className="flex flex-col items-start gap-1 sm:items-end">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Target className="size-3.5" /> Período: últimos 30 dias
          </span>
          <span className="text-xs text-muted-foreground capitalize">{periodLabel}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat
          label="Vendas hoje"
          value={brl(sum(today, "gross_amount"))}
          hint={`${today.length} venda(s)`}
          icon={Receipt}
        />
        <Stat
          label="Últimos 7 dias"
          value={brl(sum(week, "gross_amount"))}
          hint={`${week.length} venda(s)`}
          icon={TrendingUp}
        />
        <Stat
          label="Lucro líquido (30d)"
          value={brl(netProfit)}
          hint={`taxas ${brl(sum(month, "fee_amount") + terminalFee)}`}
          tone="success"
          teaser
          gradient
          icon={Wallet}
        />
        <Stat
          label="Margem de lucro (30d)"
          value={`${num(monthGross > 0 ? (netProfit / monthGross) * 100 : 0, 1)}%`}
          hint="sobre o faturamento"
          tone="success"
          teaser
          icon={Percent}
        />
        <Stat
          label="vs. período anterior"
          value={`${variation >= 0 ? "+" : ""}${num(variation, 1)}%`}
          hint={`${brl(lastGross)} antes`}
          tone={variation >= 0 ? "success" : "warning"}
          trend={variation}
          icon={variation >= 0 ? TrendingUp : TrendingDown}
        />
      </div>

      <UnlockHint />

      <div className="surface p-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <LineChartIcon className="size-4" />
            </span>
            <h2 className="font-display text-lg font-semibold">Faturamento diário</h2>
          </div>
          <span className="text-xs text-muted-foreground">últimos 14 dias</span>
        </div>
        <div className="mt-4 h-[220px] w-full">
          {mounted && (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={daily} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="dashRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={56}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickFormatter={(v: number) => brl(Number(v))}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  formatter={(v) => [brl(Number(v)), "Faturamento"]}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="var(--chart-1)"
                  strokeWidth={2.5}
                  fill="url(#dashRevenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <LockedArea>
        <div className="surface p-5">
          <div className="flex items-center gap-2">
            <Target className="size-4 text-primary" />
            <h2 className="font-display text-lg font-semibold">Meta do mês</h2>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="num text-2xl font-semibold">{brl(monthGross)}</span>
            <span className="num text-sm text-muted-foreground">meta {brl(goal)}</span>
          </div>
          <Progress value={goalPct} className="mt-3" />
          <p className="mt-2 text-xs text-muted-foreground">
            {goal > 0 ? `${num(goalPct, 0)}% da meta atingida` : "Defina uma meta em Ajustes para acompanhar."}
          </p>
        </div>
      </LockedArea>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="surface p-5">
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <PieChartIcon className="size-4" />
            </span>
            <h2 className="font-display text-lg font-semibold">Formas de pagamento (30d)</h2>
          </div>
          <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row">
            <div className="relative size-[168px] shrink-0">
              {mounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData.length ? donutData : [{ key: "empty", total: 1, color: "var(--border)" }]}
                      dataKey="total"
                      nameKey="label"
                      innerRadius={54}
                      outerRadius={80}
                      paddingAngle={donutData.length > 1 ? 3 : 0}
                      stroke="var(--card)"
                      strokeWidth={2}
                    >
                      {(donutData.length ? donutData : [{ key: "empty", color: "var(--border)" }]).map((m) => (
                        <Cell key={m.key} fill={m.color} />
                      ))}
                    </Pie>
                    {donutData.length > 0 && (
                      <Tooltip
                        contentStyle={{
                          background: "var(--card)",
                          border: "1px solid var(--border)",
                          borderRadius: 12,
                          fontSize: 12,
                        }}
                        formatter={(v) => brl(Number(v))}
                      />
                    )}
                  </PieChart>
                </ResponsiveContainer>
              )}
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[0.6875rem] text-muted-foreground">total</span>
                <span className="num text-sm font-semibold">
                  <BlurredValue>{brl(monthGross)}</BlurredValue>
                </span>
              </div>
            </div>
            <ul className="w-full flex-1 space-y-2">
              {methods.map((m) => (
                <li key={m.key} className="flex items-center gap-3">
                  <MethodIcon method={m.key} className="size-8" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{m.label}</p>
                    <p className="num text-xs text-muted-foreground">{num(m.share, 1)}%</p>
                  </div>
                  <span className="num text-sm font-medium">
                    <BlurredValue>{brl(m.total)}</BlurredValue>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="surface p-5">
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-full bg-warning-soft text-warning-foreground">
              <Trophy className="size-4" />
            </span>
            <h2 className="font-display text-lg font-semibold">Desempenho por vendedor</h2>
          </div>
          {bySeller.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Nenhuma venda registrada ainda.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {bySeller.slice(0, 5).map((s, i) => {
                const first = i === 0;
                return (
                  <li
                    key={s.id}
                    className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${
                      first
                        ? "border-warning/50 bg-warning-soft shadow-sm"
                        : "border-border bg-card"
                    }`}
                  >
                    <span
                      className={`flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                        first
                          ? "bg-warning text-graphite"
                          : i === 1
                            ? "bg-secondary text-foreground"
                            : "bg-secondary/70 text-muted-foreground"
                      }`}
                    >
                      {first ? <Trophy className="size-4" /> : i === 1 ? <Medal className="size-4" /> : i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {s.id === session?.userId ? "Você" : `Vendedor ${s.id.slice(0, 4)}`}
                      </p>
                      <p className="num text-xs text-muted-foreground">{s.count} venda(s)</p>
                    </div>
                    <span className="num text-right text-sm font-semibold">{brl(s.total)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {lowStock.length > 0 && (
        <div className="surface border-warning/40 bg-warning-soft/40 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-full bg-warning-soft text-warning-foreground">
                <AlertTriangle className="size-5" />
              </span>
              <div>
                <h2 className="font-display text-lg font-semibold">Estoque em alerta</h2>
                <p className="text-xs text-muted-foreground">
                  {lowStock.length} item(ns) no ou abaixo do mínimo
                </p>
              </div>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link to="/estoque">Ver estoque</Link>
            </Button>
          </div>
          <ul className="mt-4 space-y-1.5 text-sm">
            {lowStock.slice(0, 5).map((p) => (
              <li
                key={p.id}
                className="flex justify-between rounded-lg bg-card/70 px-3 py-2"
              >
                <span>{p.name}</span>
                <span className="num font-medium text-warning-foreground">
                  {num(Number(p.stock_qty), 0)} / mín {num(Number(p.min_stock), 0)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="surface p-5">
        <h2 className="font-display text-lg font-semibold">Últimas vendas</h2>
        {sales.length === 0 ? (
          <div className="mt-4 flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-8 text-center">
            <PackageSearch className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Registre sua primeira venda no módulo Vendas.
            </p>
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {sales.slice(0, 8).map((s) => (
              <li key={s.id} className="flex items-center gap-3 py-2.5">
                <MethodIcon method={s.method} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{methodMeta(s.method).label}</p>
                  <p className="text-xs text-muted-foreground">{shortDate(s.created_at)}</p>
                </div>
                <div className="text-right">
                  <p className="num text-sm font-semibold">
                    <BlurredValue>{brl(Number(s.gross_amount))}</BlurredValue>
                  </p>
                  <p className="num text-xs text-muted-foreground">
                    <BlurredValue teaser>{`líq. ${brl(Number(s.net_amount))}`}</BlurredValue>
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
