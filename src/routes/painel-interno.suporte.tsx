import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Loader2, MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";
import {
  getAdminSupportConversation,
  getAdminSupportTickets,
  sendAdminSupportMessage,
  updateAdminSupportStatus,
  type AdminSupportStatus,
} from "@/lib/admin-support.functions";
import { dateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { SupportStatusBadge } from "@/components/support-shared";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/painel-interno/suporte")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Central de suporte — Gestto" },
      { name: "description", content: "Atendimento interno aos clientes da Gestto." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Central de suporte — Gestto" },
      { property: "og:description", content: "Atendimento interno aos clientes da Gestto." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminSupportPage,
});

type Filter = "open" | "in_progress" | "resolved" | "all";

function AdminSupportPage() {
  const { isAdmin } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const fetchTickets = useServerFn(getAdminSupportTickets);
  const fetchConversation = useServerFn(getAdminSupportConversation);
  const sendMessage = useServerFn(sendAdminSupportMessage);
  const updateStatus = useServerFn(updateAdminSupportStatus);
  const [filter, setFilter] = useState<Filter>("open");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const ticketsQuery = useQuery({
    queryKey: ["admin-support-tickets"],
    queryFn: () => fetchTickets(),
    refetchInterval: 5_000,
    enabled: isAdmin,
  });
  const conversationQuery = useQuery({
    queryKey: ["admin-support-conversation", selectedId],
    queryFn: () => fetchConversation({ data: { ticketId: selectedId ?? "" } }),
    refetchInterval: 5_000,
    enabled: isAdmin && Boolean(selectedId),
  });

  const visibleTickets = useMemo(() => {
    const tickets = ticketsQuery.data ?? [];
    return filter === "all"
      ? tickets
      : tickets.filter((ticket) => filter === "resolved" ? ticket.status === "resolved" || ticket.status === "closed" : ticket.status === filter);
  }, [filter, ticketsQuery.data]);

  useEffect(() => {
    if (selectedId && visibleTickets.some((ticket) => ticket.id === selectedId)) return;
    setSelectedId(visibleTickets[0]?.id ?? null);
  }, [selectedId, visibleTickets]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [conversationQuery.data?.messages.length]);

  const replyMutation = useMutation({
    mutationFn: () => sendMessage({ data: { ticketId: selectedId ?? "", body: reply } }),
    onSuccess: () => {
      setReply("");
      queryClient.invalidateQueries({ queryKey: ["admin-support-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["admin-support-conversation", selectedId] });
    },
    onError: (error: Error) => toast.error("Não foi possível responder", { description: error.message }),
  });

  const statusMutation = useMutation({
    mutationFn: (status: AdminSupportStatus) => updateStatus({ data: { ticketId: selectedId ?? "", status } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-support-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["admin-support-conversation", selectedId] });
      toast.success("Status atualizado");
    },
    onError: (error: Error) => toast.error("Não foi possível alterar o status", { description: error.message }),
  });

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="surface max-w-md p-8 text-center">
          <h1 className="text-2xl font-bold">Acesso restrito</h1>
          <p className="mt-2 text-sm text-muted-foreground">Você não tem permissão para acessar a central de suporte.</p>
          <Button asChild className="mt-6"><Link to="/dashboard">Voltar ao dashboard</Link></Button>
        </div>
      </div>
    );
  }

  const conversation = conversationQuery.data;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl space-y-5 px-4 py-6">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon"><Link to="/painel-interno" aria-label="Voltar"><ArrowLeft className="size-4" /></Link></Button>
          <div>
            <h1 className="text-2xl font-bold">Central de suporte</h1>
            <p className="text-sm text-muted-foreground">Atendimentos dos clientes Gestto.</p>
          </div>
        </div>

        <Tabs value={filter} onValueChange={(value) => setFilter(value as Filter)}>
          <TabsList className="grid h-auto w-full grid-cols-4 sm:w-auto">
            <TabsTrigger value="open">Abertos</TabsTrigger>
            <TabsTrigger value="in_progress">Em andamento</TabsTrigger>
            <TabsTrigger value="resolved">Resolvidos</TabsTrigger>
            <TabsTrigger value="all">Todos</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="grid min-h-[650px] gap-4 lg:grid-cols-[360px_1fr]">
          <div className="surface overflow-hidden">
            <ScrollArea className="h-[650px]">
              <div className="divide-y divide-border">
                {ticketsQuery.isLoading && <p className="p-5 text-sm text-muted-foreground">Carregando atendimentos…</p>}
                {!ticketsQuery.isLoading && visibleTickets.length === 0 && <p className="p-5 text-sm text-muted-foreground">Nenhum atendimento neste filtro.</p>}
                {visibleTickets.map((ticket) => (
                  <button
                    type="button"
                    key={ticket.id}
                    onClick={() => setSelectedId(ticket.id)}
                    className={cn("w-full p-4 text-left transition-colors hover:bg-muted/60", selectedId === ticket.id && "bg-primary-soft")}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate text-sm font-semibold">{ticket.companyName}</p>
                      <SupportStatusBadge status={ticket.status} />
                    </div>
                    <p className="mt-2 line-clamp-1 text-sm font-medium">{ticket.subject}</p>
                    <p className="text-xs text-muted-foreground">{ticket.category}</p>
                    <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{ticket.preview}</p>
                    <p className="mt-2 text-[11px] text-muted-foreground">{dateTime(ticket.lastMessageAt)}</p>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>

          <div className="surface flex min-h-[650px] flex-col overflow-hidden">
            {!selectedId && <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-muted-foreground"><MessageSquare className="mb-3 size-8" /><p className="text-sm">Selecione um atendimento.</p></div>}
            {selectedId && conversationQuery.isLoading && <p className="p-5 text-sm text-muted-foreground">Carregando conversa…</p>}
            {conversation && (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
                  <div>
                    <p className="font-semibold">{conversation.ticket.companyName}</p>
                    <p className="text-sm">{conversation.ticket.subject}</p>
                    <p className="text-xs text-muted-foreground">{conversation.ticket.category}</p>
                  </div>
                  <Select value={conversation.ticket.status} onValueChange={(value) => statusMutation.mutate(value as AdminSupportStatus)} disabled={statusMutation.isPending}>
                    <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Aguardando resposta</SelectItem>
                      <SelectItem value="in_progress">Em andamento</SelectItem>
                      <SelectItem value="resolved">Resolvido</SelectItem>
                      <SelectItem value="closed">Fechado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <ScrollArea className="min-h-0 flex-1 bg-muted/20 p-4">
                  <div className="space-y-3 pr-3">
                    {conversation.messages.map((message) => {
                      const admin = message.senderRole === "admin";
                      return (
                        <div key={message.id} className={`flex ${admin ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[85%] rounded-xl px-3 py-2 ${admin ? "bg-primary text-primary-foreground" : "bg-card shadow-sm"}`}>
                            <p className={`mb-1 text-[11px] font-medium ${admin ? "text-primary-foreground/75" : "text-muted-foreground"}`}>
                              {admin ? "Suporte Gestto" : message.senderName} · {dateTime(message.createdAt)}
                            </p>
                            <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.body}</p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={endRef} />
                  </div>
                </ScrollArea>
                <form className="flex items-end gap-2 border-t border-border p-4" onSubmit={(event) => { event.preventDefault(); replyMutation.mutate(); }}>
                  <Textarea aria-label="Resposta" rows={2} value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Responder ao cliente" maxLength={4000} />
                  <Button type="submit" size="icon" disabled={replyMutation.isPending || !reply.trim()} aria-label="Enviar resposta">
                    {replyMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                  </Button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}