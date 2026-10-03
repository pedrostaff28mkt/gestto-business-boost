import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AdminSupportStatus = "open" | "in_progress" | "resolved" | "closed";

async function requireAdmin(context: { supabase: any; userId: string }) {
  const { data: profile, error } = await context.supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", context.userId)
    .maybeSingle();
  if (error || !profile?.is_admin) throw new Error("Acesso restrito");
}

export const getAdminSupportTickets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: tickets, error } = await supabaseAdmin
      .from("support_tickets")
      .select("id, company_id, category, subject, status, last_message_at, companies(name)")
      .order("last_message_at", { ascending: false });
    if (error) throw error;

    const ids = (tickets ?? []).map((ticket) => ticket.id);
    const previews = new Map<string, string>();
    if (ids.length > 0) {
      const { data: messages, error: messageError } = await supabaseAdmin
        .from("support_messages")
        .select("ticket_id, body, created_at")
        .in("ticket_id", ids)
        .order("created_at", { ascending: false });
      if (messageError) throw messageError;
      for (const message of messages ?? []) {
        if (!previews.has(message.ticket_id)) previews.set(message.ticket_id, message.body);
      }
    }

    return (tickets ?? []).map((ticket) => ({
      id: ticket.id,
      category: ticket.category,
      subject: ticket.subject,
      status: ticket.status as AdminSupportStatus,
      lastMessageAt: ticket.last_message_at,
      companyName: (ticket.companies as { name?: string } | null)?.name ?? "Empresa",
      preview: previews.get(ticket.id) ?? "Sem mensagens",
    }));
  });

export const getAdminSupportConversation = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ ticketId: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: ticket, error: ticketError }, { data: messages, error: messageError }] = await Promise.all([
      supabaseAdmin
        .from("support_tickets")
        .select("id, category, subject, status, last_message_at, companies(name)")
        .eq("id", data.ticketId)
        .single(),
      supabaseAdmin
        .from("support_messages")
        .select("id, sender_role, body, created_at, profiles(full_name)")
        .eq("ticket_id", data.ticketId)
        .order("created_at", { ascending: true }),
    ]);
    if (ticketError) throw ticketError;
    if (messageError) throw messageError;
    return {
      ticket: {
        id: ticket.id,
        category: ticket.category,
        subject: ticket.subject,
        status: ticket.status as AdminSupportStatus,
        lastMessageAt: ticket.last_message_at,
        companyName: (ticket.companies as { name?: string } | null)?.name ?? "Empresa",
      },
      messages: (messages ?? []).map((message) => ({
        id: message.id,
        senderRole: message.sender_role,
        body: message.body,
        createdAt: message.created_at,
        senderName: (message.profiles as { full_name?: string } | null)?.full_name ?? "Cliente",
      })),
    };
  });

export const sendAdminSupportMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ ticketId: z.string().uuid(), body: z.string().trim().min(1).max(4000) }).parse(data))
  .handler(async ({ context, data }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("support_messages").insert({
      ticket_id: data.ticketId,
      sender_id: context.userId,
      sender_role: "admin",
      body: data.body,
    });
    if (error) throw error;
    return { ok: true };
  });

export const updateAdminSupportStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({
    ticketId: z.string().uuid(),
    status: z.enum(["open", "in_progress", "resolved", "closed"]),
  }).parse(data))
  .handler(async ({ context, data }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("support_tickets")
      .update({ status: data.status })
      .eq("id", data.ticketId);
    if (error) throw error;
    return { ok: true };
  });
