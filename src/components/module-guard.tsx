import { Link, useLocation } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import { useGestto, type AppModule } from "@/hooks/use-gestto";
import { Button } from "@/components/ui/button";

/** Rota do painel -> módulo exigido para ver a página. */
export const ROUTE_MODULES: { path: string; module: AppModule }[] = [
  { path: "/dashboard", module: "dashboard" },
  { path: "/vendas", module: "sales" },
  { path: "/estoque", module: "inventory" },
  { path: "/financeiro", module: "finance" },
  { path: "/crm", module: "crm" },
  { path: "/equipe", module: "team" },
  { path: "/ia", module: "ai" },
];

/** Bloqueia a página inteira se a pessoa não tiver can(module, "view"). */
export function ModuleGuard({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const { session, can, isLoading } = useGestto();
  const match = ROUTE_MODULES.find((r) => pathname === r.path || pathname.startsWith(r.path + "/"));
  if (!match || isLoading || !session) return <>{children}</>;
  if (can(match.module, "view")) return <>{children}</>;

  const home = ROUTE_MODULES.find((r) => can(r.module, "view"))?.path ?? "/configuracoes";

  return (
    <div className="surface mx-auto mt-10 max-w-md p-8 text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-secondary">
        <Lock className="size-5 text-muted-foreground" />
      </div>
      <h1 className="mt-4 font-display text-xl font-semibold">Acesso restrito</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Você não tem permissão para ver esta página.
      </p>
      <Button asChild className="mt-6">
        <Link to={home}>Voltar ao início</Link>
      </Button>
    </div>
  );
}
