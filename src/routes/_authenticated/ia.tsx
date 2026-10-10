import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, Send, Loader2, Lock } from "lucide-react";
import { useGestto, type AppModule } from "@/hooks/use-gestto";
import { useActiveBranch } from "@/hooks/use-active-branch";
import { usePaywall } from "@/components/paywall";
import { sendAiMessage } from "@/lib/ai-chat.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/ia")({
  head: () => ({
    meta: [
      { title: "IA — Gestto" },
      { name: "description", content: "Pergunte sobre vendas, estoque, financeiro e clientes e receba respostas com os dados do seu negócio." },
      { property: "og:title", content: "IA — Gestto" },
      { property: "og:description", content: "Assistente que responde com os dados reais da sua empresa." },
    ],
  }),
  component: IaPage,
});

type Msg = { role: "user" | "assistant"; content: string; error?: boolean };

const ATTENTION_PROMPT =
  "O que merece minha atenção hoje? Consulte as áreas que eu tenho acesso (vendas de hoje, estoque baixo, contas vencidas e clientes sumidos) e responda com NO MÁXIMO 3 prioridades, cada uma em uma linha começando com um verbo de ação, ordenadas por urgência.";

const CHIPS: { label: string; prompt: string; modules: AppModule[] }[] = [
  { label: "O que merece minha atenção hoje?", prompt: ATTENTION_PROMPT, modules: [] },
  { label: "Quanto vendi hoje?", prompt: "Quanto vendi hoje?", modules: ["sales"] },
  { label: "Quais produtos estão acabando?", prompt: "Quais produtos estão acabando?", modules: ["inventory"] },
  { label: "Quais clientes estão sumidos?", prompt: "Quais clientes estão sumidos?", modules: ["crm"] },
  { label: "Como está meu financeiro neste mês?", prompt: "Como está meu financeiro neste mês?", modules: ["finance"] },
];

function IaPage() {
  const { session, can } = useGestto();
  const { filterBranchId } = useActiveBranch();
  const { open: openPaywall } = usePaywall();
  const send = useServerFn(sendAiMessage);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [usage, setUsage] = useState<{ used: number; limit: number } | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs, pending]);

  if (!session) return null;

  const locked = session.subscription.status !== "active";
  const anyData = (["sales", "inventory", "finance", "crm"] as AppModule[]).some((m) => can(m));
  const chips = CHIPS.filter((c) => (c.modules.length ? c.modules.every((m) => can(m)) : anyData));

  async function ask(display: string, prompt = display) {
    const text = prompt.trim();
    if (!text || pending || !session || locked) return;
    const history = [...msgs.filter((m) => !m.error), { role: "user" as const, content: text }];
    setMsgs((m) => [...m, { role: "user", content: display.trim() }]);
    setInput("");
    setPending(true);
    try {
      const res = await send({
        data: {
          companyId: session.companyId,
          branchId: filterBranchId ?? null,
          messages: history.slice(-10).map(({ role, content }) => ({ role, content: content.slice(0, 4000) })),
        },
      });
      if (res.ok) {
        setMsgs((m) => [...m, { role: "assistant", content: res.reply }]);
        setUsage({ used: res.used, limit: res.limit });
      } else {
        setMsgs((m) => [...m, { role: "assistant", content: res.message, error: true }]);
        if (res.limit !== undefined) setUsage({ used: res.used ?? 0, limit: res.limit });
      }
    } catch {
      setMsgs((m) => [
        ...m,
        { role: "assistant", content: "Não consegui responder agora. Tente de novo em instantes.", error: true },
      ]);
    } finally {
      setPending(false);
    }
  }

  const submit = (display: string, prompt?: string) => {
    if (locked) return openPaywall();
    void ask(display, prompt);
  };

  return (
    <div className="mx-auto flex h-[calc(100dvh-10rem)] max-w-3xl flex-col gap-3">
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="size-5 text-primary" />
          <h1 className="font-display text-2xl font-bold">IA do Gestto</h1>
        </div>
        {usage && !locked && (
          <span className="num text-xs text-muted-foreground">
            {usage.used} de {usage.limit} perguntas hoje
          </span>
        )}
      </header>

      {locked && (
        <div className="flex flex-col gap-3 rounded-xl border border-warning/40 bg-warning-soft p-4 text-warning-foreground sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Lock className="size-4 shrink-0" />
            <p className="text-sm font-semibold">A IA é exclusiva para assinantes.</p>
          </div>
          <Button size="sm" onClick={openPaywall}>Ativar assinatura</Button>
        </div>
      )}

      <div className="surface flex-1 space-y-4 overflow-y-auto p-4">
        {msgs.length === 0 && (
          <div className="py-10 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary-soft text-primary">
              <Sparkles className="size-5" />
            </div>
            <p className="mt-3 font-display text-lg font-semibold">Pergunte sobre o seu negócio</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Eu consulto vendas, estoque, financeiro e clientes — só o que você tem acesso.
            </p>
          </div>
        )}
        {msgs.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="flex justify-end">
              <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm text-primary-foreground">
                {m.content}
              </p>
            </div>
          ) : (
            <div key={i} className="flex items-start gap-2">
              <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                <Sparkles className="size-3.5" />
              </span>
              <p
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-tl-md px-4 py-2.5 text-sm ${
                  m.error ? "bg-warning/10 text-foreground" : "bg-secondary text-foreground"
                }`}
              >
                {m.content}
              </p>
            </div>
          ),
        )}
        {pending && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="flex size-7 items-center justify-center rounded-full bg-primary-soft text-primary">
              <Sparkles className="size-3.5" />
            </span>
            <Loader2 className="size-4 animate-spin" /> pensando…
          </div>
        )}
        <div ref={endRef} />
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {chips.map((c) => (
            <button
              key={c.label}
              type="button"
              disabled={pending || locked}
              onClick={() => submit(c.label, c.prompt)}
              className="rounded-full border border-border bg-background px-3 py-1.5 text-xs transition-colors hover:border-primary hover:bg-primary-soft disabled:opacity-50"
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      <form
        className="flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          submit(input);
        }}
      >
        <Textarea
          value={input}
          maxLength={2000}
          rows={1}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit(input);
            }
          }}
          disabled={locked}
          placeholder={locked ? "Disponível para assinantes" : "Escreva sua pergunta…"}
          className="min-h-[44px] resize-none"
        />
        <Button type="submit" size="icon" className="size-11 shrink-0" disabled={locked || pending || !input.trim()} aria-label="Enviar">
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        </Button>
      </form>
      <p className="text-center text-[11px] text-muted-foreground">
        A IA pode errar. Confira números importantes no painel.
      </p>
    </div>
  );
}
