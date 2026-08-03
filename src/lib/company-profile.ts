export const EMPLOYEE_RANGES = [
  { value: "solo", label: "Só eu" },
  { value: "2-5", label: "2 a 5 pessoas" },
  { value: "6-20", label: "6 a 20 pessoas" },
  { value: "21-50", label: "21 a 50 pessoas" },
  { value: "50+", label: "Mais de 50 pessoas" },
] as const;

export const REVENUE_RANGES = [
  { value: "0-10k", label: "Até R$ 10 mil/mês" },
  { value: "10-50k", label: "R$ 10 mil a R$ 50 mil/mês" },
  { value: "50-200k", label: "R$ 50 mil a R$ 200 mil/mês" },
  { value: "200k+", label: "Acima de R$ 200 mil/mês" },
] as const;

export const SEGMENTS = [
  { value: "Alimentação", label: "Alimentação" },
  { value: "Varejo/Loja", label: "Varejo / Loja" },
  { value: "Indústria/Produção", label: "Indústria / Produção" },
  { value: "Serviços", label: "Serviços" },
  { value: "Outro", label: "Outro" },
] as const;

export type EmployeeRange = (typeof EMPLOYEE_RANGES)[number]["value"];
export type RevenueRange = (typeof REVENUE_RANGES)[number]["value"];
export type CompanySize = "pequeno" | "medio" | "grande";

export const companySizeLabels: Record<CompanySize, string> = {
  pequeno: "Pequeno porte",
  medio: "Médio porte",
  grande: "Grande porte",
};

const employeeScore: Record<EmployeeRange, number> = {
  solo: 1,
  "2-5": 1,
  "6-20": 2,
  "21-50": 3,
  "50+": 3,
};

const revenueScore: Record<RevenueRange, number> = {
  "0-10k": 1,
  "10-50k": 1,
  "50-200k": 2,
  "200k+": 3,
};

/**
 * Regra simples: usamos a maior das duas pontuações (funcionários e faturamento).
 * 1 = pequeno, 2 = médio, 3 = grande.
 */
export function classifyCompanySize(
  employees: EmployeeRange,
  revenue: RevenueRange,
): CompanySize {
  const score = Math.max(employeeScore[employees], revenueScore[revenue]);
  return score >= 3 ? "grande" : score === 2 ? "medio" : "pequeno";
}
