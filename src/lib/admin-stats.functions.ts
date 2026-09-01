import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AdminStats = {
  totalCompanies: number;
  trialing: number;
  trialExpired: number;
  active: number;
  totalUsers: number;
  bySize: { size: string; label: string; total: number }[];
  perDay: { date: string; total: number }[];
};

export const getAdminStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminStats> => {
    const { data: profile, error: profileError } = await context.supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", context.userId)
      .maybeSingle();

    if (profileError || !profile?.is_admin) {
      throw new Error("Acesso restrito");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [companiesRes, subsRes, membershipsRes] = await Promise.all([
      supabaseAdmin.from("companies").select("id, created_at, company_size"),
      supabaseAdmin.from("subscriptions").select("status, trial_ends_at"),
      supabaseAdmin.from("memberships").select("user_id"),
    ]);

    const companies = companiesRes.data ?? [];
    const subs = subsRes.data ?? [];
    const memberships = membershipsRes.data ?? [];

    const now = Date.now();
    let trialing = 0;
    let trialExpired = 0;
    let active = 0;
    for (const s of subs) {
      if (s.status === "active") active += 1;
      else if (new Date(s.trial_ends_at).getTime() > now) trialing += 1;
      else trialExpired += 1;
    }

    const sizeLabels: Record<string, string> = {
      pequeno: "Pequeno porte",
      medio: "Médio porte",
      grande: "Grande porte",
      indefinido: "Não informado",
    };
    const sizeCount: Record<string, number> = {};
    for (const c of companies) {
      const key = c.company_size ?? "indefinido";
      sizeCount[key] = (sizeCount[key] ?? 0) + 1;
    }
    const bySize = ["pequeno", "medio", "grande", "indefinido"]
      .filter((k) => sizeCount[k])
      .map((k) => ({ size: k, label: sizeLabels[k]!, total: sizeCount[k]! }));

    const perDay: { date: string; total: number }[] = [];
    for (let i = 29; i >= 0; i -= 1) {
      const d = new Date(now - i * 86_400_000);
      const key = d.toISOString().slice(0, 10);
      perDay.push({
        date: key,
        total: companies.filter((c) => String(c.created_at).slice(0, 10) === key).length,
      });
    }

    return {
      totalCompanies: companies.length,
      trialing,
      trialExpired,
      active,
      totalUsers: new Set(memberships.map((m) => m.user_id)).size,
      bySize,
      perDay,
    };
  });
