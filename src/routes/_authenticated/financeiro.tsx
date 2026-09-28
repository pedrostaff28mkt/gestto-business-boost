import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Wallet,
  TrendingUp,
  PieChart as PieChartIcon,
  ListChecks,
  Plus,
  Check,
  Trash2,
  Loader2,
  Lock,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useGestto } from "@/hooks/use-gestto";
import { useActiveBranch } from "@/hooks/use-active-branch";
import { brl, pct } from "@/lib/format";
import { BlurredValue, usePaywall } from "@/components/paywall";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/financeiro")({
  head: () => ({
    meta: [
      { title: "Financeiro — Gestto" },
      { name: "description", content: "Contas a pagar e receber, folha, fluxo de caixa e DRE simplificado." },
      { property: "og:title", content: "Financeiro — Gestto" },
      { property: "og:description", content: "Fluxo de caixa, DRE e simulador de imposto do seu negócio." },
    ],
  }),
  component: FinanceiroPage,
});

const CATEGORIES = [
  "Aluguel",
  "Energia",
  "Água",
  "Internet",
  "Fornecedor",
  "Folha de pagamento",
  "Impostos",
  "Marketing",
  "Outros",
];

const DONUT_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--destructive)"];

type Entry = {
  id: string;
  type: "income" | "expense";
  category: string;
  description: string | null;
  amount: number;
  due_date: string;
  paid_date: string | null;
  status: "pending" | "paid" | "overdue";
  branch_id: string | null;
};

/** yyyy-mm-dd no fuso local. */
function localYmd(d: Date = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function ymdLabel(ymd: string) {
  const [, m, d] = ymd.split("-");
  return `${d}/${m}`;
}

function parseMoney(v: string) {
  const clean = v.trim().replace(/\s|R\$/g, "");
  const normalized = clean.includes(",") ? clean.replace(/\./g, "").replace(",", ".") : clean;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : NaN;
}

type DisplayStatus = "paid" | "pending" | "overdue";
function displayStatus(e: Entry, today: string): DisplayStatus {
  if (e.status === "paid") return "paid";
  if (e.due_date < today) return "overdue";
  return "pending";
}

const STATUS_META: Record<DisplayStatus, { label: string; cls: string }> = {
  paid: { label: "Pago", cls: "bg-success-soft text-success border-transparent" },
  pending: { label: "Pendente", cls: "bg-warning-soft text-warning-foreground border-transparent" },
  overdue: { label: "Atrasado", cls: "bg-destructive/15 text-destructive border-transparent" },
};

function FinanceiroPage() {
  const { session, can } = useGestto();
  const { filterBranchId, branches, activeBranch, canSwitch } = useActiveBranch();
  const { guard } = usePaywall();
  const queryClient = useQueryClient();
  const [mounted, setMounted] = useState(false);
  const [filter, setFilter] = useState<"all" | "expense" | "income">("all");
  const [formOpen, setFormOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Entry | null>(null);

  useEffect(() => setMounted(true), []);

  const companyId = session?.companyId;
  const today = localYmd();
  const start30 = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    return localYmd(d);
  }, []);
  const monthStart = today.slice(0, 8) + "01";
  const rangeStart = start30 < monthStart ? start30 : monthStart;
  // Início do intervalo em horário local, para vendas (timestamp).
  const rangeStartIso = useMemo(() => {
    const [y, m, d] = rangeStart.split("-").map(Number);
    return new Date(y, m - 1, d).toISOString();
  }, [rangeStart]);

  const canView = can("finance", "view");

  const salesQuery = useQuery({
    queryKey: ["fin-sales", companyId, filterBranchId, rangeStartIso],
    enabled: !!companyId && canView,
    queryFn: async () => {
      let q = supabase
        .from("sales")
        .select("gross_amount, fee_amount, net_amount, created_at")
        .eq("company_id", companyId!)
        .eq("status", "paid")
        .gte("created_at", rangeStartIso);
      if (filterBranchId) q = q.eq("branch_id", filterBranchId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const entriesQuery = useQuery({
    queryKey: ["fin-entries", companyId, filterBranchId],
    enabled: !!companyId && canView,
    queryFn: async () => {
      let q = supabase
        .from("financial_entries")
        .select("id, type, category, description, amount, due_date, paid_date, status, branch_id")
        .eq("company_id", companyId!)
        .order("due_date", { ascending: true });
      if (filterBranchId) q = q.eq("branch_id", filterBranchId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map((e) => ({ ...e, amount: Number(e.amount) })) as Entry[];
    },
  });

  const sales = salesQuery.data ?? [];
  const entries = entriesQuery.data ?? [];
  const loading = salesQuery.isLoading || entriesQuery.isLoading;

  // Fluxo de caixa 30 dias
  const cashflow = useMemo(() => {
    const days: { key: string; label: string; entrada: number; saida: number }[] = [];
    const idx = new Map<string, number>();
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = localYmd(d);
      idx.set(key, days.length);
      days.push({ key, label: ymdLabel(key), entrada: 0, saida: 0 });
    }
    for (const s of sales) {
      const k = localYmd(new Date(s.created_at));
      const i = idx.get(k);
      if (i !== undefined) days[i].entrada += Number(s.net_amount);
    }
    for (const e of entries) {
      if (e.status !== "paid" || !e.paid_date) continue;
      const i = idx.get(e.paid_date);
      if (i === undefined) continue;
      if (e.type === "income") days[i].entrada += e.amount;
      else days[i].saida += e.amount;
    }
    return days;
  }, [sales, entries]);

  const totalIn30 = cashflow.reduce((a, d) => a + d.entrada, 0);
  const totalOut30 = cashflow.reduce((a, d) => a + d.saida, 0);

  // DRE do mês
  const dre = useMemo(() => {
    let salesGross = 0;
    let fees = 0;
    for (const s of sales) {
      if (localYmd(new Date(s.created_at)) < monthStart) continue;
      salesGross += Number(s.gross_amount);
      fees += Number(s.fee_amount);
    }
    let otherIncome = 0;
    let expenses = 0;
    const byCat = new Map<string, number>();
    for (const e of entries) {
      if (e.status !== "paid" || !e.paid_date || e.paid_date < monthStart || e.paid_date > today) continue;
      if (e.type === "income") otherIncome += e.amount;
      else {
        expenses += e.amount;
        byCat.set(e.category, (byCat.get(e.category) ?? 0) + e.amount);
      }
    }
    const revenue = salesGross + otherIncome;
    const result = revenue - fees - expenses;
    const margin = revenue > 0 ? (result / revenue) * 100 : 0;
    const cats = [...byCat.entries()]
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total)
      .map((c, i) => ({ ...c, color: DONUT_COLORS[i % DONUT_COLORS.length] }));
    return { salesGross, fees, otherIncome, expenses, revenue, result, margin, cats };
  }, [sales, entries, monthStart, today]);

  const listed = useMemo(() => {
    const list = entries.filter((e) => filter === "all" || e.type === filter);
    return [...list].sort((a, b) => {
      const ap = a.status === "paid" ? 1 : 0;
      const bp = b.status === "paid" ? 1 : 0;
      if (ap !== bp) return ap - bp;
      return a.due_date.localeCompare(b.due_date);
    });
  }, [entries, filter]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["fin-entries"] });

  const markPaid = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("financial_entries")
        .update({ status: "paid", paid_date: localYmd() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Conta marcada como paga");
      invalidate();
    },
    onError: (e: Error) => toast.error("Erro ao atualizar", { description: e.message }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("financial_entries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lançamento excluído");
      setToDelete(null);
      invalidate();
    },
    onError: (e: Error) => toast.error("Erro ao excluir", { description: e.message }),
  });

  if (!session) return null;
  if (!canView) {
    return (
      <div className="surface flex flex-col items-center gap-2 p-8 text-center">
        <Lock className="size-6 text-muted-foreground" />
        <p className="font-medium">Você não tem acesso ao Financeiro.</p>
        <p className="text-sm text-muted-foreground">Peça ao dono da empresa para liberar este módulo.</p>
      </div>
    );
  }

  const canCreate = can("finance", "create");
  const canEdit = can("finance", "edit");
  const canDelete = can("finance", "delete");

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Wallet className="size-5 text-primary" />
          <h1 className="font-display text-2xl font-bold">Financeiro</h1>
        </div>
        {canCreate && (
          <Button onClick={() => guard(() => setFormOpen(true))} className="gap-1.5">
            <Plus className="size-4" /> Nova conta
          </Button>
        )}
      </header>

      {/* Fluxo de caixa */}
      <section className="surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <TrendingUp className="size-4" />
            </span>
            <h2 className="font-display text-lg font-semibold">Fluxo de caixa</h2>
          </div>
          <span className="text-xs text-muted-foreground">últimos 30 dias</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-sm">
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-success" /> Entradas{" "}
            <span className="num font-semibold">
              <BlurredValue>{brl(totalIn30)}</BlurredValue>
            </span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-warning" /> Saídas{" "}
            <span className="num font-semibold">
              <BlurredValue>{brl(totalOut30)}</BlurredValue>
            </span>
          </span>
        </div>
        <div className="mt-4 h-[220px] w-full">
          {loading ? (
            <div className="h-full animate-pulse rounded-xl bg-muted" />
          ) : (
            mounted && (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cashflow} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="finIn" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--success)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="var(--success)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="finOut" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--warning)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="var(--warning)" stopOpacity={0} />
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
                    formatter={(v, name) => [brl(Number(v)), name === "entrada" ? "Entradas" : "Saídas"]}
                  />
                  <Area type="monotone" dataKey="entrada" stroke="var(--success)" strokeWidth={2.5} fill="url(#finIn)" />
                  <Area type="monotone" dataKey="saida" stroke="var(--warning)" strokeWidth={2.5} fill="url(#finOut)" />
                </AreaChart>
              </ResponsiveContainer>
            )
          )}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* DRE */}
        <section className="surface p-5">
          <h2 className="font-display text-lg font-semibold">Resultado do mês</h2>
          <p className="text-xs text-muted-foreground">
            {new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            <DreRow label="Receita de vendas" value={dre.salesGross} />
            <DreRow label="(+) Outras receitas" value={dre.otherIncome} />
            <DreRow label="(−) Taxas de cartão" value={-dre.fees} />
            <DreRow label="(−) Despesas pagas" value={-dre.expenses} />
          </ul>
          <div className="mt-4 rounded-xl bg-primary/10 p-4">
            <p className="text-xs text-muted-foreground">Resultado líquido do mês</p>
            <p className={`num mt-1 text-2xl font-bold ${dre.result < 0 ? "text-destructive" : "text-foreground"}`}>
              <BlurredValue teaser>{brl(dre.result)}</BlurredValue>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Margem sobre a receita:{" "}
              <span className="num font-semibold text-foreground">
                <BlurredValue teaser>{pct(dre.margin)}</BlurredValue>
              </span>
            </p>
          </div>
        </section>

        {/* Despesas por categoria */}
        <section className="surface p-5">
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <PieChartIcon className="size-4" />
            </span>
            <h2 className="font-display text-lg font-semibold">Despesas por categoria</h2>
          </div>
          {dre.cats.length === 0 ? (
            <p className="mt-6 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Nenhuma despesa paga neste mês ainda. Quando você marcar contas como pagas, elas aparecem aqui.
            </p>
          ) : (
            <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row">
              <div className="relative size-[168px] shrink-0">
                {mounted && (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={dre.cats}
                        dataKey="total"
                        nameKey="category"
                        innerRadius={54}
                        outerRadius={80}
                        paddingAngle={dre.cats.length > 1 ? 3 : 0}
                        stroke="var(--card)"
                        strokeWidth={2}
                      >
                        {dre.cats.map((c) => (
                          <Cell key={c.category} fill={c.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: "var(--card)",
                          border: "1px solid var(--border)",
                          borderRadius: 12,
                          fontSize: 12,
                        }}
                        formatter={(v) => brl(Number(v))}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[0.6875rem] text-muted-foreground">total</span>
                  <span className="num text-sm font-semibold">
                    <BlurredValue>{brl(dre.expenses)}</BlurredValue>
                  </span>
                </div>
              </div>
              <ul className="w-full flex-1 space-y-2">
                {dre.cats.map((c) => (
                  <li key={c.category} className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="size-2.5 shrink-0 rounded-full" style={{ background: c.color }} />
                      <span className="truncate">{c.category}</span>
                    </span>
                    <span className="num shrink-0 text-right">
                      <BlurredValue>{brl(c.total)}</BlurredValue>{" "}
                      <span className="text-xs text-muted-foreground">
                        {pct(dre.expenses > 0 ? (c.total / dre.expenses) * 100 : 0)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>

      {/* Contas */}
      <section className="surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ListChecks className="size-4 text-primary" />
            <h2 className="font-display text-lg font-semibold">Contas a pagar e a receber</h2>
          </div>
          <div className="grid grid-cols-3 gap-1 rounded-lg border border-border bg-muted p-1 text-xs">
            {(
              [
                { v: "all", l: "Todas" },
                { v: "expense", l: "A pagar" },
                { v: "income", l: "A receber" },
              ] as const
            ).map((o) => (
              <button
                key={o.v}
                type="button"
                onClick={() => setFilter(o.v)}
                className={`rounded-md px-3 py-1.5 ${
                  filter === o.v ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                {o.l}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="mt-4 space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : listed.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-border p-8 text-center">
            <p className="font-medium">Nenhuma conta por aqui</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Cadastre aluguel, fornecedores e valores a receber para acompanhar vencimentos.
            </p>
          </div>
        ) : (
          <ul className="mt-4 space-y-2">
            {listed.map((e) => {
              const st = displayStatus(e, today);
              const meta = STATUS_META[st];
              return (
                <li key={e.id} className="rounded-xl border border-border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-medium">{e.category}</span>
                        <Badge className={meta.cls}>{meta.label}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {e.type === "expense" ? "A pagar" : "A receber"}
                        </span>
                      </div>
                      {e.description && (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">{e.description}</p>
                      )}
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Vence {ymdLabel(e.due_date)}/{e.due_date.slice(0, 4)}
                        {e.paid_date ? ` · pago ${ymdLabel(e.paid_date)}` : ""}
                        {!filterBranchId && canSwitch
                          ? ` · ${branches.find((b) => b.id === e.branch_id)?.name ?? "Geral da empresa"}`
                          : ""}
                      </p>
                    </div>
                    <span
                      className={`num shrink-0 text-sm font-semibold ${
                        e.type === "expense" ? "text-foreground" : "text-success"
                      }`}
                    >
                      <BlurredValue>{`${e.type === "expense" ? "−" : "+"} ${brl(e.amount)}`}</BlurredValue>
                    </span>
                  </div>
                  {(canEdit && e.status !== "paid") || canDelete ? (
                    <div className="mt-2 flex justify-end gap-2">
                      {canEdit && e.status !== "paid" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5"
                          disabled={markPaid.isPending}
                          onClick={() => guard(() => markPaid.mutate(e.id))}
                        >
                          <Check className="size-3.5" /> Marcar como pago
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label="Excluir"
                          onClick={() => guard(() => setToDelete(e))}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <NewEntryDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        companyId={session.companyId}
        userId={session.userId}
        isOwner={session.role === "owner"}
        ownBranchId={session.branchId}
        defaultBranch={activeBranch === "all" ? "" : activeBranch}
        branches={branches}
        onCreated={invalidate}
      />

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lançamento?</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete ? `${toDelete.category} — ${brl(toDelete.amount)}. ` : ""}Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(ev) => {
                ev.preventDefault();
                if (toDelete) remove.mutate(toDelete.id);
              }}
              disabled={remove.isPending}
            >
              {remove.isPending && <Loader2 className="size-4 animate-spin" />} Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function DreRow({ label, value }: { label: string; value: number }) {
  return (
    <li className="flex items-center justify-between border-b border-border pb-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className={`num font-medium ${value < 0 ? "text-destructive" : ""}`}>
        <BlurredValue>{brl(value)}</BlurredValue>
      </span>
    </li>
  );
}

function NewEntryDialog({
  open,
  onOpenChange,
  companyId,
  userId,
  isOwner,
  ownBranchId,
  defaultBranch,
  branches,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  companyId: string;
  userId: string;
  isOwner: boolean;
  ownBranchId: string | null;
  defaultBranch: string;
  branches: { id: string; name: string }[];
  onCreated: () => void;
}) {
  const [type, setType] = useState<"expense" | "income">("expense");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState(localYmd());
  const [branch, setBranch] = useState(defaultBranch);

  useEffect(() => {
    if (open) {
      setBranch(defaultBranch);
      setDueDate(localYmd());
    }
  }, [open, defaultBranch]);

  const create = useMutation({
    mutationFn: async () => {
      const value = parseMoney(amount);
      if (!category.trim()) throw new Error("Informe a categoria");
      if (!Number.isFinite(value) || value <= 0) throw new Error("Informe um valor maior que zero");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) throw new Error("Informe o vencimento");
      const { error } = await supabase.from("financial_entries").insert({
        company_id: companyId,
        branch_id: isOwner ? branch || null : ownBranchId,
        type,
        category: category.trim().slice(0, 80),
        description: description.trim().slice(0, 200) || null,
        amount: value,
        due_date: dueDate,
        status: "pending",
        created_by: userId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Conta cadastrada");
      setCategory("");
      setDescription("");
      setAmount("");
      onOpenChange(false);
      onCreated();
    },
    onError: (e: Error) => toast.error("Não foi possível salvar", { description: e.message }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova conta</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-muted p-1 text-sm">
            {(
              [
                { v: "expense", l: "A pagar" },
                { v: "income", l: "A receber" },
              ] as const
            ).map((o) => (
              <button
                key={o.v}
                type="button"
                onClick={() => setType(o.v)}
                className={`rounded-md px-3 py-2 ${
                  type === o.v ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                {o.l}
              </button>
            ))}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fin-cat">Categoria</Label>
            <Input
              id="fin-cat"
              list="fin-cat-list"
              value={category}
              maxLength={80}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Ex: Aluguel"
            />
            <datalist id="fin-cat-list">
              {CATEGORIES.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fin-desc">Descrição (opcional)</Label>
            <Input id="fin-desc" value={description} maxLength={200} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="fin-amount">Valor</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  R$
                </span>
                <Input
                  id="fin-amount"
                  inputMode="decimal"
                  className="num pl-9"
                  placeholder="0,00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ""))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fin-due">Vencimento</Label>
              <Input id="fin-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
          {isOwner && (
            <div className="space-y-1.5">
              <Label htmlFor="fin-branch">Filial</Label>
              <select
                id="fin-branch"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Geral da empresa (sem filial)</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => create.mutate()} disabled={create.isPending}>
            {create.isPending && <Loader2 className="size-4 animate-spin" />} Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
