// Ferramentas somente-leitura da IA. Rodam com o cliente Supabase do USUÁRIO (RLS aplicada).
// As agregações pesadas rolam no banco via funções ai_* (SECURITY INVOKER): exatas e sem limite de linhas.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { ToolDef } from "./ai-provider.server";

type Db = SupabaseClient<Database>;
export type ToolScope = { companyId: string; branchId: string | null };
type Module = "sales" | "inventory" | "finance" | "crm";

const TZ_OFFSET = "-03:00"; // Brasília (sem horário de verão)

/** Data "hoje" (YYYY-MM-DD) no fuso de Brasília. */
export function brToday(now = new Date()): string {
  return new Date(now.getTime() - 3 * 3600_000).toISOString().slice(0, 10);
}
function addDays(ymd: string, n: number) {
  const d = new Date(ymd + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
/** Início do período em ISO (meia-noite de Brasília). */
export function periodStart(period: string, now = new Date()): { startYmd: string; startIso: string } {
  const today = brToday(now);
  let startYmd = today;
  if (period === "7d") startYmd = addDays(today, -6);
  else if (period === "30d") startYmd = addDays(today, -29);
  else if (period === "month") startYmd = today.slice(0, 8) + "01";
  return { startYmd, startIso: new Date(`${startYmd}T00:00:00${TZ_OFFSET}`).toISOString() };
}
const r2 = (n: number) => Math.round(n * 100) / 100;
const PERIODS = ["today", "7d", "30d", "month"];
const pickPeriod = (p: unknown, allowed = PERIODS, def = "today") =>
  typeof p === "string" && allowed.includes(p) ? p : def;

const METHOD_LABEL: Record<string, string> = {
  pix: "PIX",
  card_credit: "Cartão de crédito",
  card_debit: "Cartão de débito",
  cash: "Dinheiro",
};

export async function getSalesSummary(db: Db, s: ToolScope, args: { period?: unknown }) {
  const period = pickPeriod(args.period);
  const { startIso } = periodStart(period);
  const { data, error } = await db.rpc("ai_sales_summary" as never, {
    _company_id: s.companyId,
    _branch_id: s.branchId,
    _since: startIso,
  } as never);
  if (error) throw error;
  const res = data as unknown as {
    sales_count: number;
    gross: number;
    fees: number;
    net: number;
    by_method: Record<string, { count: number; total: number }>;
  };
  const byMethod: Record<string, { count: number; total: number }> = {};
  for (const [k, v] of Object.entries(res.by_method ?? {})) {
    byMethod[METHOD_LABEL[k] ?? k] = { count: Number(v.count), total: r2(Number(v.total)) };
  }
  return {
    period,
    sales_count: Number(res.sales_count),
    gross: r2(Number(res.gross)),
    fees: r2(Number(res.fees)),
    net: r2(Number(res.net)),
    by_method: byMethod,
  };
}

export async function getTopProducts(db: Db, s: ToolScope, args: { period?: unknown; limit?: unknown }) {
  const period = pickPeriod(args.period, PERIODS, "30d");
  const limit = Math.min(10, Math.max(1, Number(args.limit) || 5));
  const { startIso } = periodStart(period);
  const { data, error } = await db.rpc("ai_top_products" as never, {
    _company_id: s.companyId,
    _branch_id: s.branchId,
    _since: startIso,
    _limit: limit,
  } as never);
  if (error) throw error;
  const res = data as unknown as {
    products: { name: string; quantity: number; total: number }[];
    paid_sales_without_items: number;
  };
  return {
    period,
    products: (res.products ?? []).map((p) => ({ name: p.name, quantity: r2(Number(p.quantity)), total: r2(Number(p.total)) })),
    paid_sales_without_items: Number(res.paid_sales_without_items ?? 0),
  };
}

export async function getLowStock(db: Db, s: ToolScope) {
  const { data, error } = await db.rpc("ai_low_stock" as never, {
    _company_id: s.companyId,
    _branch_id: s.branchId,
  } as never);
  if (error) throw error;
  return data as unknown as {
    low_stock_count: number;
    low_stock: { name: string; stock: number; min: number; unit: string }[];
    expiring_15d_count: number;
    expiring_15d: { name: string; expires_at: string; expired: boolean }[];
  };
}

export async function getFinancialSummary(db: Db, s: ToolScope, args: { period?: unknown }) {
  const period = pickPeriod(args.period, ["month", "30d"], "month");
  const { startYmd, startIso } = periodStart(period);
  const today = brToday();
  const { data, error } = await db.rpc("ai_finance_summary" as never, {
    _company_id: s.companyId,
    _branch_id: s.branchId,
    _since: startIso,
    _from: startYmd,
    _to: today,
  } as never);
  if (error) throw error;
  const res = data as unknown as {
    sales_gross: number;
    card_fees: number;
    other_income: number;
    expenses_paid: number;
    top_expense_categories: { category: string; total: number }[];
  };
  const salesGross = Number(res.sales_gross);
  const fees = Number(res.card_fees);
  const otherIncome = Number(res.other_income);
  const expenses = Number(res.expenses_paid);
  const revenue = salesGross + otherIncome;
  const result = revenue - fees - expenses;
  return {
    period,
    sales_gross: r2(salesGross),
    other_income: r2(otherIncome),
    revenue: r2(revenue),
    card_fees: r2(fees),
    expenses_paid: r2(expenses),
    result: r2(result),
    margin_percent: revenue > 0 ? r2((result / revenue) * 100) : 0,
    top_expense_categories: (res.top_expense_categories ?? []).map((c) => ({ category: c.category, total: r2(Number(c.total)) })),
  };
}

export async function getOverdueAccounts(db: Db, s: ToolScope) {
  const today = brToday();
  const in7 = addDays(today, 7);
  let q = db
    .from("financial_entries")
    .select("type, category, description, amount, due_date")
    .eq("company_id", s.companyId)
    .neq("status", "paid")
    .lte("due_date", in7)
    .limit(2000);
  if (s.branchId) q = q.eq("branch_id", s.branchId);
  const { data, error } = await q;
  if (error) throw error;
  const map = (e: NonNullable<typeof data>[number]) => ({
    kind: e.type === "expense" ? "a pagar" : "a receber", category: e.category,
    description: e.description, amount: r2(Number(e.amount)), due_date: e.due_date,
  });
  const overdue = (data ?? []).filter((e) => e.due_date < today);
  const upcoming = (data ?? []).filter((e) => e.due_date >= today);
  const sum = (l: typeof overdue, t: string) => r2(l.filter((e) => e.type === t).reduce((a, e) => a + Number(e.amount), 0));
  return {
    overdue_count: overdue.length,
    overdue_total_to_pay: sum(overdue, "expense"),
    overdue_total_to_receive: sum(overdue, "income"),
    overdue_largest: [...overdue].sort((a, b) => Number(b.amount) - Number(a.amount)).slice(0, 10).map(map),
    due_next_7_days_count: upcoming.length,
    due_next_7_days: [...upcoming].sort((a, b) => (a.due_date < b.due_date ? -1 : 1)).slice(0, 10).map(map),
  };
}

export async function getInactiveCustomers(db: Db, s: ToolScope, args: { days?: unknown }) {
  const days = Math.min(365, Math.max(1, Number(args.days) || 45));
  const { data, error } = await db.rpc("ai_inactive_customers" as never, {
    _company_id: s.companyId,
    _branch_id: s.branchId,
    _days: days,
  } as never);
  if (error) throw error;
  const res = data as unknown as {
    inactive_count: number;
    inactive: { name: string; last_purchase: string; days_since: number }[];
    customers_never_bought: number;
  };
  return { days, ...res };
}

type Impl = (db: Db, s: ToolScope, args: Record<string, unknown>) => Promise<unknown>;
const P = { type: "string", enum: PERIODS, description: "today=hoje, 7d=últimos 7 dias, 30d=últimos 30 dias, month=mês atual" };

export const TOOLS: { module: Module; def: ToolDef; run: Impl }[] = [
  {
    module: "sales",
    def: { type: "function", function: { name: "get_sales_summary", description: "Resumo das vendas pagas: bruto, taxas, líquido, quantidade e total por forma de pagamento.", parameters: { type: "object", properties: { period: P }, required: ["period"], additionalProperties: false } } },
    run: (db, s, a) => getSalesSummary(db, s, a),
  },
  {
    module: "sales",
    def: { type: "function", function: { name: "get_top_products", description: "Produtos/serviços mais vendidos no período. Só considera vendas lançadas com produtos vinculados; vendas de valor manual não entram no ranking.", parameters: { type: "object", properties: { period: P, limit: { type: "integer", minimum: 1, maximum: 10 } }, required: ["period"], additionalProperties: false } } },
    run: (db, s, a) => getTopProducts(db, s, a),
  },
  {
    module: "inventory",
    def: { type: "function", function: { name: "get_low_stock", description: "Produtos ativos com estoque no mínimo ou abaixo, e produtos vencendo em até 15 dias.", parameters: { type: "object", properties: {}, additionalProperties: false } } },
    run: (db, s) => getLowStock(db, s),
  },
  {
    module: "finance",
    def: { type: "function", function: { name: "get_financial_summary", description: "Resultado financeiro: receitas, taxas de cartão, despesas pagas, resultado e margem.", parameters: { type: "object", properties: { period: { type: "string", enum: ["month", "30d"] } }, required: ["period"], additionalProperties: false } } },
    run: (db, s, a) => getFinancialSummary(db, s, a),
  },
  {
    module: "finance",
    def: { type: "function", function: { name: "get_overdue_accounts", description: "Contas a pagar/receber vencidas e as que vencem nos próximos 7 dias.", parameters: { type: "object", properties: {}, additionalProperties: false } } },
    run: (db, s) => getOverdueAccounts(db, s),
  },
  {
    module: "crm",
    def: { type: "function", function: { name: "get_inactive_customers", description: "Clientes sem comprar há mais de N dias (padrão 45).", parameters: { type: "object", properties: { days: { type: "integer", minimum: 1, maximum: 365 } }, additionalProperties: false } } },
    run: (db, s, a) => getInactiveCustomers(db, s, a),
  },
];

/** Ferramentas liberadas conforme can_view do usuário (checado no servidor). */
export function toolsFor(viewable: Set<string>) {
  return TOOLS.filter((t) => viewable.has(t.module));
}
