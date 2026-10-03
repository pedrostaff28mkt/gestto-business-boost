import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";

type Activation = { first_name: string; company_name: string; activated_at: string };

/** Mostra ativações REAIS (via get_recent_activations). Lista vazia => não renderiza nada. */
export function RecentActivationToast() {
  const { data } = useQuery({
    queryKey: ["recent-activations"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_recent_activations");
      if (error) return [] as Activation[];
      return (data ?? []) as Activation[];
    },
    staleTime: 5 * 60_000,
  });
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const list = data ?? [];

  useEffect(() => {
    if (!list.length || dismissed) return;
    const show = setTimeout(() => setVisible(true), 1500);
    const tick = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % list.length);
        setVisible(true);
      }, 500);
    }, 10_000);
    return () => {
      clearTimeout(show);
      clearInterval(tick);
    };
  }, [list.length, dismissed]);

  if (!list.length || dismissed) return null;
  const item = list[index % list.length];

  return (
    <div
      role="status"
      aria-live="polite"
      className={`surface fixed bottom-4 left-4 z-50 flex max-w-[calc(100vw-2rem)] items-start gap-3 p-3 pr-2 shadow-lg transition-all duration-500 sm:max-w-sm ${
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
      }`}
    >
      <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" />
      <p className="text-sm leading-snug">
        <span className="font-semibold">{item.first_name}</span>, de{" "}
        <span className="font-semibold">{item.company_name}</span>, assinou o Gestto{" "}
        {formatDistanceToNow(new Date(item.activated_at), { addSuffix: true, locale: ptBR })}
      </p>
      <button
        type="button"
        aria-label="Fechar"
        onClick={() => setDismissed(true)}
        className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
