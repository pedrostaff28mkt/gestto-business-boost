import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { Lock, Sparkles, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type PaywallContextValue = {
  /** Bloqueio real: trial expirado e sem assinatura. */
  locked: boolean;
  /** Teste grátis rodando: ações liberadas, apenas teasers borrados. */
  trialActive: boolean;
  guard: (action: () => void) => void;
  open: () => void;
};

const PaywallContext = createContext<PaywallContextValue>({
  locked: false,
  trialActive: false,
  guard: (a) => a(),
  open: () => {},
});

export const usePaywall = () => useContext(PaywallContext);

export function PaywallProvider({
  locked,
  trialActive = false,
  trialDaysLeft,
  children,
}: {
  locked: boolean;
  trialActive?: boolean;
  trialDaysLeft: number;
  children: ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const guard = useCallback(
    (action: () => void) => {
      if (locked) {
        setIsOpen(true);
        return;
      }
      action();
    },
    [locked],
  );

  const value = useMemo(
    () => ({ locked, trialActive, guard, open: () => setIsOpen(true) }),
    [locked, trialActive, guard],
  );


  return (
    <PaywallContext.Provider value={value}>
      {children}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <div className="mb-2 flex size-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <Lock className="size-5" />
            </div>
            <DialogTitle className="text-2xl">Ative o Gestto para usar esta ação</DialogTitle>
            <DialogDescription>
              {trialDaysLeft > 0
                ? `Você está no teste grátis — ${trialDaysLeft} dia(s) restante(s). Ative a assinatura para desbloquear todos os campos e ações.`
                : "Seu acesso está bloqueado. Ative a assinatura para voltar a lançar vendas, editar estoque e usar o financeiro."}
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl border border-border bg-secondary/60 p-4">
            <div className="flex items-baseline gap-2">
              <span className="num text-3xl font-semibold text-foreground">R$ 69,99</span>
              <span className="text-sm text-muted-foreground">no 1º mês</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Depois <span className="num">R$ 99,99</span>/mês. Cancele quando quiser.
            </p>
            <ul className="mt-3 space-y-1.5 text-sm">
              {["Vendas, PIX e cartão ilimitados", "Estoque, financeiro e DRE", "Equipe, permissões e IA"].map(
                (item) => (
                  <li key={item} className="flex items-center gap-2">
                    <Check className="size-4 text-success" />
                    {item}
                  </li>
                ),
              )}
            </ul>
          </div>

          <Button size="lg" className="w-full gap-2" onClick={() => setIsOpen(false)}>
            <Sparkles className="size-4" />
            Ativar assinatura
          </Button>
          <button
            className="text-center text-xs text-muted-foreground underline-offset-4 hover:underline"
            onClick={() => setIsOpen(false)}
          >
            Continuar explorando no modo demonstração
          </button>
        </DialogContent>
      </Dialog>
    </PaywallContext.Provider>
  );
}

/** Envolve um campo/ação: mostra cadeado e intercepta a interação quando bloqueado. */
export function LockedArea({ children, className }: { children: ReactNode; className?: string }) {
  const { locked, open } = usePaywall();
  if (!locked) return <div className={className}>{children}</div>;

  return (
    <div className={`relative ${className ?? ""}`}>
      <div className="pointer-events-none opacity-70 select-none">{children}</div>
      <button
        type="button"
        onClick={open}
        aria-label="Recurso bloqueado — ativar assinatura"
        className="absolute inset-0 flex items-start justify-end rounded-xl bg-background/10 p-2 transition-colors hover:bg-primary-soft"
      >
        <span className="flex size-6 items-center justify-center rounded-md bg-graphite text-background shadow-sm">
          <Lock className="size-3" />
        </span>
      </button>
    </div>
  );
}

/**
 * Valor numérico desfocado quando o trial expirou.
 * Com `teaser`, também fica desfocado durante o teste grátis (ex.: Lucro Líquido e Margem).
 */
export function BlurredValue({
  children,
  className,
  teaser = false,
  label = "Ative sua assinatura para ver",
}: {
  children: ReactNode;
  className?: string;
  teaser?: boolean;
  label?: string;
}) {
  const { locked, trialActive, open } = usePaywall();
  const blurred = locked || (teaser && trialActive);
  if (!blurred) return <span className={className}>{children}</span>;

  return (
    <button
      type="button"
      onClick={open}
      title={label}
      aria-label={label}
      className={`group inline-flex items-center gap-1.5 text-left ${className ?? ""}`}
    >
      <span className="select-none blur-[6px]" aria-hidden="true">
        {children}
      </span>
      <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-graphite text-background">
        <Lock className="size-3" />
      </span>
    </button>
  );
}

/** Texto/link discreto que abre o modal de assinatura. */
export function UnlockHint({ className }: { className?: string }) {
  const { locked, trialActive, open } = usePaywall();
  if (!locked && !trialActive) return null;

  return (
    <button
      type="button"
      onClick={open}
      className={`inline-flex items-center gap-1 text-xs text-warning-foreground underline-offset-4 hover:underline ${className ?? ""}`}
    >
      <Lock className="size-3" /> Ative sua assinatura para ver
    </button>
  );
}

