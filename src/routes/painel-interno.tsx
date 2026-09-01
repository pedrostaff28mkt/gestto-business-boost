import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Building2, Users, Clock, CheckCircle2, XCircle } from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { getAdminStats } from "@/lib/admin-stats.functions";
import { num, shortDate } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/painel-interno")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Painel interno — Gestto" },
      { name: "description", content: "Métricas internas de contas, assinaturas e porte das empresas." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Painel interno — Gestto" },
      { property: "og:description", content: "Métricas internas da plataforma Gestto." },
    ],
  }),
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/auth" });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", data.user.id)
      .maybeSingle();

    return { isAdmin: profile?.is_admin === true };
  },
  component: AdminPanel,
});

const INDIGO = "#3D2FF0";

function Metric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Users;
}) {
  return (
    <div className="surface p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{label}</p>
        <span className="flex size-7 items-center justify-center rounded-lg bg-secondary">
          <Icon className="size-3.5" />
        </span>
      </div>
      <p className="num mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function AccessDenied() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="surface max-w-md p-8 text-center">
        <h1 className="text-2xl font-bold text-foreground">Acesso restrito</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Você não tem permissão para acessar o painel interno.
        </p>
        <div className="mt-6">
          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Voltar ao dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

function AdminPanel() {
  const { isAdmin } = Route.useRouteContext();
  const fetchStats = useServerFn(getAdminStats);
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => fetchStats(),
    refetchInterval: 60_000,
    enabled: isAdmin,
  });

  if (!isAdmin) {
    return <AccessDenied />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-8">
        <div>
          <h1 className="text-2xl font-bold">Painel interno Gestto</h1>
          <p className="text-sm text-muted-foreground">
            Métricas da plataforma. Uso interno — não divulgue esta URL.
          </p>
        </div>

        {isLoading && <p className="text-sm text-muted-foreground">Carregando métricas…</p>}
        {error && (
          <p className="text-sm text-destructive">Não foi possível carregar as métricas.</p>
        )}

        {data && (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
              <Metric label="Empresas cadastradas" value={num(data.totalCompanies)} icon={Building2} />
              <Metric label="Em trial ativo" value={num(data.trialing)} icon={Clock} />
              <Metric label="Trial expirado" value={num(data.trialExpired)} icon={XCircle} />
              <Metric label="Assinatura ativa" value={num(data.active)} icon={CheckCircle2} />
              <Metric label="Usuários totais" value={num(data.totalUsers)} icon={Users} />
            </div>

            <div className="surface p-5">
              <h2 className="font-display text-lg font-semibold">Empresas por porte</h2>
              {data.bySize.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">Nenhum porte registrado ainda.</p>
              ) : (
                <div className="mt-4 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.bySize}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                      <XAxis dataKey="label" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis allowDecimals={false} fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip />
                      <Bar dataKey="total" name="Empresas" fill={INDIGO} radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="surface p-5">
              <h2 className="font-display text-lg font-semibold">Novas empresas (últimos 30 dias)</h2>
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.perDay}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                    <XAxis
                      dataKey="date"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v: string) => shortDate(`${v}T12:00:00`)}
                      interval={4}
                    />
                    <YAxis allowDecimals={false} fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip labelFormatter={(v) => shortDate(`${v}T12:00:00`)} />
                    <Line
                      type="monotone"
                      dataKey="total"
                      name="Empresas"
                      stroke={INDIGO}
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
