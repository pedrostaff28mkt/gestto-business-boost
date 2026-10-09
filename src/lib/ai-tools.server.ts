// Ferramentas somente-leitura da IA. Rodam com o cliente Supabase do USUÁRIO (RLS aplicada).
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
  let q = db
    .from("sales")
    .select("gross_amount, fee_amount, net_amount, method")
    .eq("company_id", s.companyId)
    .eq("status", "paid")
    .gte("created_at", startIso)
    .limit(5000);
  if (s.branchId) q = q.eq("branch_id", s.branchId);
  const { data, error } = await q;
  if (error) throw error;
  const byMethod: Record<string, { count: number; total: number }> = {};
  let gross = 0, fees = 0, net = 0;
  for (const r of data ?? []) {
    gross += Number(r.gross_amount); fees += Number(r.fee_amount); net += Number(r.net_amount);
    const k = METHOD_LABEL[r.method] ?? r.method;
    byMethod[k] ??= { count: 0, total: 0 };
    byMethod[k].count++; byMethod[k].total += Number(r.gross_amount);
  }
  for (const k in byMethod) byMethod[k].total = r2(byMethod[k].total);
  return { period, sales_count: data?.length ?? 0, gross: r2(gross), fees: r2(fees), net: r2(net), by_method: byMethod };
}

export async function getTopProducts(db: Db, s: ToolScope, args: { period?: unknown; limit?: unknown }) {
  const period = pickPeriod(args.period, PERIODS, "30d");
  const limit = Math.min(10, Math.max(1, Number(args.limit) || 5));
  const { startIso } = periodStart(period);
  let q = db
    .from("sale_items")
    .select("description, quantity, total, sales!inner(status, created_at, branch_id)")
    .eq("company_id", s.companyId)
    .eq("sales.status", "paid")
    .gte("sales.created_at", startIso)
    .limit(5000);
  if (s.branchId) q = q.eq("sales.branch_id", s.branchId);
  const { data, error } = await q;
  if (error) throw error;
  const agg = new Map<string, { quantity: number; total: number }>();
  for (const r of data ?? []) {
    const a = agg.get(r.description) ?? { quantity: 0, total: 0 };
    a.quantity += Number(r.quantity); a.total += Number(r.total);
    agg.set(r.description, a);
  }
  const top = [...agg.entries()]
    .map(([name, v]) => ({ name, quantity: r2(v.quantity), total: r2(v.total) }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, limit);
  return { period, products: top };
}

export async function getLowStock(db: Db, s: ToolScope) {
  let q = db
    .from("products")
    .select("name, stock_qty, min_stock, unit, expires_at")
    .eq("company_id", s.companyId)
    .eq("active", true)
    .limit(2000);
  if (s.branchId) q = q.eq("branch_id", s.branchId);
  const { data, error } = await q;
  if (error) throw error;
  const today = brToday();
  const soon = addDays(today, 15);
  const low = (data ?? [])
    .filter((p) => Number(p.stock_qty) <= Number(p.min_stock))
    .sort((a, b) => Number(a.stock_qty) - Number(b.stock_qty));
  const expiring = (data ?? [])
    .filter((p) => p.expires_at && p.expires_at <= soon)
    .sort((a, b) => (a.expires_at! < b.expires_at! ? -1 : 1));
  return {
    low_stock_count: low.length,
    low_stock: low.slice(0, 10).map((p) => ({ name: p.name, stock: Number(p.stock_qty), min: Number(p.min_stock), unit: p.unit })),
    expiring_15d_count: expiring.length,
    expiring_15d: expiring.slice(0, 10).map((p) => ({ name: p.name, expires_at: p.expires_at, expired: p.expires_at! < today })),
  };
}

export async function getFinancialSummary(db: Db, s: ToolScope, args: { period?: unknown }) {
  const period = pickPeriod(args.period, ["month", "30d"], "month");
  const { startYmd, startIso } = periodStart(period);
  const today = brToday();
  let sq = db
    .from("sales")
    .select("gross_amount, fee_amount")
    .eq("company_id", s.companyId)
    .eq("status", "paid")
    .gte("created_at", startIso)
    .limit(5000);
  let eq = db
    .from("financial_entries")
    .select("type, amount, category")
    .eq("company_id", s.companyId)
    .eq("status", "paid")
    .gte("paid_date", startYmd)
    .lte("paid_date", today)
    .limit(5000);
  if (s.branchId) { sq = sq.eq("branch_id", s.branchId); eq = eq.eq("branch_id", s.branchId); }
  const [{ data: sales, error: e1 }, { data: entries, error: e2 }] = await Promise.all([sq, eq]);
  if (e1) throw e1;
  if (e2) throw e2;
  let salesGross = 0, fees = 0, otherIncome = 0, expenses = 0;
  const cats = new Map<string, number>();
  for (const r of sales ?? []) { salesGross += Number(r.gross_amount); fees += Number(r.fee_amount); }
  for (const e of entries ?? []) {
    if (e.type === "income") otherIncome += Number(e.amount);
    else { expenses += Number(e.amount); cats.set(e.category, (cats.get(e.category) ?? 0) + Number(e.amount)); }
  }
  const revenue = salesGross + otherIncome;
  const result = revenue - fees - expenses;
  return {
    period,
    sales_gross: r2(salesGross), other_income: r2(otherIncome), revenue: r2(revenue),
    card_fees: r2(fees), expenses_paid: r2(expenses), result: r2(result),
    margin_percent: revenue > 0 ? r2((result / revenue) * 100) : 0,
    top_expense_categories: [...cats.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([category, total]) => ({ category, total: r2(total) })),
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
  let cq = db.from("customers").select("id, name, created_at").eq("company_id", s.companyId).limit(5000);
  let sq = db
    .from("sales")
    .select("customer_id, created_at")
    .eq("company_id", s.companyId)
    .eq("status", "paid")
    .not("customer_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(10000);
  if (s.branchId) { cq = cq.eq("branch_id", s.branchId); sq = sq.eq("branch_id", s.branchId); }
  const [{ data: customers, error: e1 }, { data: sales, error: e2 }] = await Promise.all([cq, sq]);
  if (e1) throw e1;
  if (e2) throw e2;
  const last = new Map<string, string>();
  for (const r of sales ?? []) if (r.customer_id && !last.has(r.customer_id)) last.set(r.customer_id, r.created_at);
  const cutoff = Date.now() - days * 86400_000;
  const inactive = (customers ?? [])
    .filter((c) => last.has(c.id) && new Date(last.get(c.id)!).getTime() < cutoff)
    .map((c) => ({ name: c.name, last_purchase: last.get(c.id)!.slice(0, 10), days_since: Math.floor((Date.now() - new Date(last.get(c.id)!).getTime()) / 86400_000) }))
    .sort((a, b) => b.days_since - a.days_since);
  const neverBought = (customers ?? []).filter((c) => !last.has(c.id)).length;
  return { days, inactive_count: inactive.length, inactive: inactive.slice(0, 10), customers_never_bought: neverBought };
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
    def: { type: "function", function: { name: "get_top_products", description: "Produtos/serviços mais vendidos no período.", parameters: { type: "object", properties: { period: P, limit: { type: "integer", minimum: 1, maximum: 10 } }, required: ["period"], additionalProperties: false } } },
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
