import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LifeBuoy, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useGestto } from "@/hooks/use-gestto";
import { dateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  SUPPORT_CATEGORIES,
  SupportStatusBadge,
  type SupportStatus,
} from "@/components/support-shared";

type Ticket = {
  id: string;
  category: string;
  subject: string;
  status: SupportStatus;
  last_message_at: string;
};

type Message = {
  id: string;
  sender_role: string;
  body: string;
  created_at: string;
};

async function fetchCompanySupport(companyId: string) {
  const { data: tickets, error: ticketError } = await supabase
    .from("support_tickets")
    .select("id, category, subject, status, last_message_at")
    .eq("company_id", companyId)
    .order("last_message_at", { ascending: false });
  if (ticketError) throw ticketError;

  const typedTickets = (tickets ?? []) as Ticket[];
  const ticket = typedTickets.find((item) => item.status === "open" || item.status === "in_progress") ?? typedTickets[0] ?? null;
  if (!ticket) return { ticket: null, messages: [] as Message[] };

  const { data: messages, error: messageError } = await supabase
    .from("support_messages")
    .select("id, sender_role, body, created_at")
    .eq("ticket_id", ticket.id)
    .order("created_at", { ascending: true });
  if (messageError) throw messageError;
  return { ticket, messages: (messages ?? []) as Message[] };
}

export function SupportSection() {
  const { session } = useGestto();
  const queryClient = useQueryClient();
  const [newTicket, setNewTicket] = useState(false);
  const [category, setCategory] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [reply, setReply] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const companyId = session?.companyId;

  const supportQuery = useQuery({
    queryKey: ["company-support", companyId],
    queryFn: () => fetchCompanySupport(companyId ?? ""),
    enabled: Boolean(companyId),
    refetchInterval: 5_000,
  });

  const createTicket = useMutation({
    mutationFn: async () => {
      if (!session) throw new Error("Sessão não encontrada.");
      const cleanSubject = subject.trim();
      const cleanDescription = description.trim();
      if (!category || !cleanSubject || !cleanDescription) throw new Error("Preencha todos os campos.");

      const { data: ticket, error: ticketError } = await supabase
        .from("support_tickets")
        .insert({
          company_id: session.companyId,
          created_by: session.userId,
          category,
          subject: cleanSubject,
        })
        .select("id")
        .single();
      if (ticketError) throw ticketError;

      const { error: messageError } = await supabase.from("support_messages").insert({
        ticket_id: ticket.id,
        sender_id: session.userId,
        sender_role: "client",
        body: cleanDescription,
      });
      if (messageError) throw messageError;
    },
    onSuccess: () => {
      setCategory("");
      setSubject("");
      setDescription("");
      setNewTicket(false);
      queryClient.invalidateQueries({ queryKey: ["company-support", companyId] });
      toast.success("Atendimento aberto");
    },
    onError: (error: Error) => toast.error("Não foi possível abrir o atendimento", { description: error.message }),
  });

  const sendMessage = useMutation({
    mutationFn: async () => {
      const ticket = supportQuery.data?.ticket;
      const cleanReply = reply.trim();
      if (!session || !ticket || !cleanReply) throw new Error("Digite uma mensagem.");
      const { error } = await supabase.from("support_messages").insert({
        ticket_id: ticket.id,
        sender_id: session.userId,
        sender_role: "client",
        body: cleanReply,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setReply("");
      queryClient.invalidateQueries({ queryKey: ["company-support", companyId] });
    },
    onError: (error: Error) => toast.error("Não foi possível enviar", { description: error.message }),
  });

  const ticket = supportQuery.data?.ticket ?? null;
  const messages = supportQuery.data?.messages ?? [];
  const closed = ticket?.status === "resolved" || ticket?.status === "closed";
  const showTriage = newTicket || (!supportQuery.isLoading && !ticket);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages.length]);

  return (
    <div className="surface space-y-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <LifeBuoy className="size-4 text-primary" />
          <h2 className="font-display text-lg font-semibold">Suporte</h2>
        </div>
        {!showTriage && ticket && <SupportStatusBadge status={ticket.status} />}
      </div>

      {supportQuery.isLoading && <p className="text-sm text-muted-foreground">Carregando atendimento…</p>}
      {supportQuery.isError && <p className="text-sm text-destructive">Não foi possível carregar o atendimento.</p>}

      {showTriage && (
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            createTicket.mutate();
          }}
        >
          <div className="space-y-1.5">
            <Label>Categoria</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue placeholder="Selecione uma categoria" /></SelectTrigger>
              <SelectContent>
                {SUPPORT_CATEGORIES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="support-subject">Assunto</Label>
            <Input id="support-subject" value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={120} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="support-description">Descreva o que está acontecendo</Label>
            <Textarea id="support-description" rows={4} value={description} onChange={(event) => setDescription(event.target.value)} maxLength={4000} />
          </div>
          <Button type="submit" disabled={createTicket.isPending || !category || !subject.trim() || !description.trim()}>
            {createTicket.isPending && <Loader2 className="size-4 animate-spin" />} Abrir atendimento
          </Button>
        </form>
      )}

      {!showTriage && ticket && (
        <div className="space-y-4">
          <div>
            <p className="font-medium">{ticket.subject}</p>
            <p className="text-xs text-muted-foreground">{ticket.category}</p>
          </div>
          <ScrollArea className="h-[360px] rounded-lg border border-border bg-muted/30 p-3">
            <div className="space-y-3 pr-3">
              {messages.map((message) => {
                const client = message.sender_role === "client";
                return (
                  <div key={message.id} className={`flex ${client ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] rounded-xl px-3 py-2 ${client ? "bg-primary text-primary-foreground" : "bg-card text-card-foreground shadow-sm"}`}>
                      <p className={`mb-1 text-[11px] font-medium ${client ? "text-primary-foreground/75" : "text-muted-foreground"}`}>
                        {client ? "Você" : "Suporte Gestto"} · {dateTime(message.created_at)}
                      </p>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.body}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={endRef} />
            </div>
          </ScrollArea>

          {closed ? (
            <div className="flex flex-col gap-3 rounded-lg bg-muted p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">Este atendimento foi encerrado.</p>
              <Button variant="outline" onClick={() => setNewTicket(true)}>Abrir novo atendimento</Button>
            </div>
          ) : (
            <form
              className="flex items-end gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                sendMessage.mutate();
              }}
            >
              <Textarea aria-label="Mensagem" rows={2} value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Digite sua mensagem" maxLength={4000} />
              <Button type="submit" size="icon" disabled={sendMessage.isPending || !reply.trim()} aria-label="Enviar mensagem">
                {sendMessage.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              </Button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
