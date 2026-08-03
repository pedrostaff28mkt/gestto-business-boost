import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  CreditCard,
  QrCode,
  Trophy,
  AlertTriangle,
  Target,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useGestto } from "@/hooks/use-gestto";
import { brl, num, shortDate } from "@/lib/format";
import { LockedArea, BlurredValue, UnlockHint } from "@/components/paywall";
import { Progress } from "@/components/ui/progress";


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
  icon: Icon,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "success" | "warning";
  icon: typeof TrendingUp;
}) {
  const toneClass =
    tone === "success" ? "bg-success-soft" : tone === "warning" ? "bg-warning-soft" : "bg-secondary";
  return (
    <div className="surface p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{label}</p>
        <span className={`flex size-7 items-center justify-center rounded-lg ${toneClass}`}>
          <Icon className="size-3.5" />
        </span>
      </div>
      <p className="num mt-2 text-2xl font-semibold">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function DashboardPage() {
  const { session } = useGestto();
  const companyId = session?.companyId;

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

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Olá, {session?.fullName.split(" ")[0]}</h1>
        <p className="text-sm text-muted-foreground">Resumo de {session?.companyName}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Vendas hoje" value={brl(sum(today, "gross_amount"))} hint={`${today.length} venda(s)`} icon={TrendingUp} />
        <Stat label="Últimos 7 dias" value={brl(sum(week, "gross_amount"))} hint={`${week.length} venda(s)`} icon={TrendingUp} />
        <Stat
          label="Lucro líquido (30d)"
          value={brl(netProfit)}
          hint={`taxas ${brl(sum(month, "fee_amount") + terminalFee)}`}
          tone="success"
          icon={TrendingUp}
        />
        <Stat
          label="vs. período anterior"
          value={`${variation >= 0 ? "+" : ""}${num(variation, 1)}%`}
          hint={`${brl(lastGross)} antes`}
          tone={variation >= 0 ? "success" : "warning"}
          icon={variation >= 0 ? TrendingUp : TrendingDown}
        />
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
          <h2 className="font-display text-lg font-semibold">Formas de pagamento (30d)</h2>
          <div className="mt-3 space-y-2">
            {[
              { key: "pix", label: "PIX", icon: QrCode },
              { key: "card_credit", label: "Crédito", icon: CreditCard },
              { key: "card_debit", label: "Débito", icon: CreditCard },
              { key: "cash", label: "Dinheiro", icon: CreditCard },
            ].map((m) => {
              const rows = month.filter((s) => s.method === m.key);
              const total = sum(rows, "gross_amount");
              const share = monthGross > 0 ? (total / monthGross) * 100 : 0;
              return (
                <div key={m.key} className="flex items-center gap-3">
                  <m.icon className="size-4 text-muted-foreground" />
                  <span className="w-20 text-sm">{m.label}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${share}%` }} />
                  </div>
                  <span className="num w-24 text-right text-sm">{brl(total)}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="surface p-5">
          <div className="flex items-center gap-2">
            <Trophy className="size-4 text-warning-foreground" />
            <h2 className="font-display text-lg font-semibold">Desempenho por vendedor</h2>
          </div>
          {bySeller.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Nenhuma venda registrada ainda.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {bySeller.slice(0, 5).map((s, i) => (
                <li key={s.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                  <span className="text-sm">
                    {i + 1}º {s.id === session?.userId ? "Você" : `Vendedor ${s.id.slice(0, 4)}`}
                    <span className="ml-2 text-xs text-muted-foreground">{s.count} venda(s)</span>
                  </span>
                  <span className="num text-sm font-medium">{brl(s.total)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {lowStock.length > 0 && (
        <div className="surface border-warning/40 p-5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-warning-foreground" />
            <h2 className="font-display text-lg font-semibold">Estoque em alerta</h2>
          </div>
          <ul className="mt-3 space-y-1.5 text-sm">
            {lowStock.slice(0, 5).map((p) => (
              <li key={p.id} className="flex justify-between">
                <span>{p.name}</span>
                <span className="num text-warning-foreground">
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
          <p className="mt-3 text-sm text-muted-foreground">Registre sua primeira venda no módulo Vendas.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {sales.slice(0, 8).map((s) => (
              <li key={s.id} className="flex items-center justify-between py-2.5">
                <div>
                  <p className="text-sm font-medium">
                    {s.method === "pix" ? "PIX" : s.method === "cash" ? "Dinheiro" : "Cartão"}
                  </p>
                  <p className="text-xs text-muted-foreground">{shortDate(s.created_at)}</p>
                </div>
                <div className="text-right">
                  <p className="num text-sm font-medium">{brl(Number(s.gross_amount))}</p>
                  <p className="num text-xs text-muted-foreground">líq. {brl(Number(s.net_amount))}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
