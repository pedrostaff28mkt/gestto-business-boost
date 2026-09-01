import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "owner" | "manager" | "seller" | "production";
export type AppModule =
  | "sales"
  | "inventory"
  | "finance"
  | "dashboard"
  | "team"
  | "ai"
  | "crm"
  | "integrations"
  | "settings";

export const roleLabels: Record<AppRole, string> = {
  owner: "Dono / Admin",
  manager: "Gerente",
  seller: "Vendedor",
  production: "Produção",
};

export type Permission = {
  module: AppModule;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
};

export type GesttoSession = {
  userId: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  phone: string | null;
  role: AppRole;
  membershipId: string;
  companyId: string;
  companyName: string;
  companySize: string | null;
  quizCompletedAt: string | null;
  branchId: string | null;

  commissionPercent: number;
  monthlyGoal: number;
  subscription: {
    status: "trialing" | "active" | "past_due" | "canceled";
    trialEndsAt: string;
  };
  payment: {
    pixKey: string | null;
    merchantName: string | null;
    merchantCity: string | null;
    cardProvider: string | null;
    debitFee: number;
    creditFee: number;
    installmentFee: number;
    terminalMonthlyFee: number;
  };
  permissions: Permission[];
};

async function fetchSession(): Promise<GesttoSession | null> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return null;

  const { data: membership, error } = await supabase
    .from("memberships")
    .select(
      "id, role, company_id, branch_id, commission_percent, monthly_goal, companies(name, company_size, quiz_completed_at), module_permissions(module, can_view, can_create, can_edit, can_delete)",
    )

    .eq("user_id", user.id)
    .eq("active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!membership) return null;

  const [{ data: profile }, { data: sub }, { data: pay }] = await Promise.all([
    supabase.from("profiles").select("full_name, avatar_url, phone").eq("id", user.id).maybeSingle(),
    supabase
      .from("subscriptions")
      .select("status, trial_ends_at")
      .eq("company_id", membership.company_id)
      .maybeSingle(),
    supabase
      .from("payment_settings")
      .select(
        "pix_key, merchant_name, merchant_city, card_provider, debit_fee_percent, credit_fee_percent, installment_fee_percent, terminal_monthly_fee",
      )
      .eq("company_id", membership.company_id)
      .maybeSingle(),
  ]);

  const company = membership.companies as
    | { name: string; company_size: string | null; quiz_completed_at: string | null }
    | null;

  return {

    userId: user.id,
    email: user.email ?? "",
    fullName: profile?.full_name || user.email || "Usuário",
    avatarUrl: profile?.avatar_url ?? null,
    phone: profile?.phone ?? null,
    role: membership.role as AppRole,
    membershipId: membership.id,
    companyId: membership.company_id,
    companyName: company?.name ?? "Minha empresa",
    companySize: company?.company_size ?? null,
    quizCompletedAt: company?.quiz_completed_at ?? null,
    branchId: membership.branch_id,

    commissionPercent: Number(membership.commission_percent ?? 0),
    monthlyGoal: Number(membership.monthly_goal ?? 0),
    subscription: {
      status: (sub?.status ?? "trialing") as GesttoSession["subscription"]["status"],
      trialEndsAt: sub?.trial_ends_at ?? new Date().toISOString(),
    },
    payment: {
      pixKey: pay?.pix_key ?? null,
      merchantName: pay?.merchant_name ?? null,
      merchantCity: pay?.merchant_city ?? null,
      cardProvider: pay?.card_provider ?? null,
      debitFee: Number(pay?.debit_fee_percent ?? 0),
      creditFee: Number(pay?.credit_fee_percent ?? 0),
      installmentFee: Number(pay?.installment_fee_percent ?? 0),
      terminalMonthlyFee: Number(pay?.terminal_monthly_fee ?? 0),
    },
    permissions: (membership.module_permissions ?? []) as Permission[],
  };
}

export function useGestto() {
  const query = useQuery({ queryKey: ["gestto-session"], queryFn: fetchSession, staleTime: 30_000 });
  const session = query.data ?? null;

  const isPaywalled = session ? session.subscription.status !== "active" : true;
  const trialDaysLeft = session
    ? Math.max(
        0,
        Math.ceil(
          (new Date(session.subscription.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
        ),
      )
    : 0;

  /** Teste grátis rodando: o lead usa tudo de verdade, só o "gostinho" fica borrado. */
  const trialActive = isPaywalled && trialDaysLeft > 0;
  /** Trial acabou e não há assinatura: bloqueio total (LockedArea + blur em tudo). */
  const subscriptionRequired = isPaywalled && trialDaysLeft <= 0;

  const can = (module: AppModule, action: "view" | "create" | "edit" | "delete" = "view") => {
    if (!session) return false;
    const perm = session.permissions.find((p) => p.module === module);
    if (!perm) return false;
    return perm[`can_${action}` as keyof Permission] === true;
  };

  return {
    ...query,
    session,
    isPaywalled,
    trialDaysLeft,
    trialActive,
    subscriptionRequired,
    can,
  };

}
