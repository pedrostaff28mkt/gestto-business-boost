import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Wallet,
  Users,
  Sparkles,
  Settings,
  LogOut,
  Lock,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useGestto, roleLabels, type AppModule } from "@/hooks/use-gestto";
import { PaywallProvider, usePaywall } from "@/components/paywall";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type NavItem = { to: string; label: string; icon: LucideIcon; module: AppModule };

const NAV: NavItem[] = [
  { to: "/dashboard", label: "Início", icon: LayoutDashboard, module: "dashboard" },
  { to: "/vendas", label: "Vendas", icon: ShoppingCart, module: "sales" },
  { to: "/estoque", label: "Estoque", icon: Package, module: "inventory" },
  { to: "/financeiro", label: "Financeiro", icon: Wallet, module: "finance" },
  { to: "/equipe", label: "Equipe", icon: Users, module: "team" },
  { to: "/ia", label: "IA", icon: Sparkles, module: "ai" },
  { to: "/configuracoes", label: "Ajustes", icon: Settings, module: "settings" },
];

function Logo({ tone = "light" }: { tone?: "light" | "dark" }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="flex size-8 items-center justify-center rounded-lg font-display text-sm font-bold text-primary-foreground"
        style={{ background: "var(--gradient-brand)" }}
      >
        G
      </div>
      <span
        className={`font-display text-lg font-bold tracking-tight ${tone === "dark" ? "text-background" : "text-foreground"}`}
      >
        Gestto
      </span>
    </div>
  );
}

function TrialStrip() {
  const { isPaywalled, trialDaysLeft, session } = useGestto();
  const { open } = usePaywall();
  if (!isPaywalled || !session) return null;
  const expired = trialDaysLeft <= 0;

  return (
    <button
      onClick={open}
      className="flex w-full items-center justify-center gap-2 bg-warning-soft px-4 py-1.5 text-center text-xs text-warning-foreground"
    >
      <Lock className="size-3.5 shrink-0" />
      <span>
        {expired ? (
          <>Modo demonstração — assinatura inativa. Ative por <span className="num font-semibold">R$ 69,99</span> no 1º mês.</>
        ) : (
          <>
            Você está no teste grátis — <span className="num font-semibold">{trialDaysLeft}</span> dia(s)
            restante(s).
          </>
        )}
      </span>
      <span className="font-semibold underline">Ativar</span>
    </button>
  );
}


function Shell({ children }: { children: ReactNode }) {
  const { session, can } = useGestto();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const items = NAV.filter((item) => can(item.module));
  const mobileItems = items.slice(0, 5);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col bg-sidebar px-4 py-6 lg:flex">
        <Logo tone="dark" />
        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {items.map((item) => {
            const active = pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                }`}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="rounded-xl bg-sidebar-accent p-3">
          <p className="truncate text-sm font-medium text-sidebar-foreground">{session?.fullName}</p>
          <p className="text-xs text-sidebar-foreground/60">{session ? roleLabels[session.role] : ""}</p>
          <Button variant="ghost" size="sm" className="mt-2 w-full justify-start gap-2 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-border" onClick={signOut}>
            <LogOut className="size-4" /> Sair
          </Button>
        </div>
      </aside>

      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur">
          <TrialStrip />
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
            <div className="lg:hidden">
              <Logo />
            </div>
            <div className="hidden lg:block">
              <p className="text-xs text-muted-foreground">Empresa</p>
              <p className="font-display text-base font-semibold">{session?.companyName}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="hidden sm:inline-flex">
                {session ? roleLabels[session.role] : ""}
              </Badge>
              <Button variant="ghost" size="icon" className="lg:hidden" onClick={signOut} aria-label="Sair">
                <LogOut className="size-4" />
              </Button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-4 pt-4 pb-28 lg:pb-12">
          <div>{children}</div>
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur lg:hidden">
        <div className="flex items-stretch justify-around px-1 py-1.5">
          {mobileItems.map((item) => {
            const active = pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex flex-1 flex-col items-center gap-1 rounded-lg px-1 py-1.5 text-[11px] ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <item.icon className="size-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { isPaywalled, trialDaysLeft, isLoading } = useGestto();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="size-8 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }

  return (
    <PaywallProvider locked={isPaywalled} trialDaysLeft={trialDaysLeft}>
      <Shell>{children}</Shell>
    </PaywallProvider>
  );
}
