import { createFileRoute } from "@tanstack/react-router";

function extractToken(payload: any): string | null {
  return (
    payload?.token ??
    payload?.data?.token ??
    payload?.subscription?.token ??
    payload?.order?.token ??
    null
  );
}

function extractEmail(payload: any): string | null {
  return (
    (
      payload?.customer?.email ??
      payload?.buyer?.email ??
      payload?.data?.customer?.email ??
      payload?.data?.buyer?.email ??
      payload?.email ??
      null
    )?.toLowerCase?.() ?? null
  );
}

function extractStatusText(payload: any): string {
  const candidates = [
    payload?.status,
    payload?.event,
    payload?.situation,
    payload?.status_name,
    payload?.subscription?.status,
    payload?.data?.status,
  ];
  return (candidates.find((c) => typeof c === "string") ?? "").toLowerCase();
}

function mapStatus(statusText: string): "active" | "past_due" | "canceled" | null {
  if (/aprovad|approved|authorized|realizada|retomad|resumed|ativa|active/.test(statusText))
    return "active";
  if (/atras|delayed|late|past_due/.test(statusText)) return "past_due";
  if (/cancel|reembols|refund|chargeback|recusad|refused|encerrad/.test(statusText))
    return "canceled";
  return null;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export const Route = createFileRoute("/api/public/ticto-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");

        let payload: any;
        const rawText = await request.text();
        try {
          payload = JSON.parse(rawText);
        } catch {
          payload = { raw: rawText };
        }

        const { data: logRow } = await admin
          .from("webhook_events_log")
          .insert({ provider: "ticto", raw_payload: payload })
          .select("id")
          .single();

        const logId = logRow?.id as string | undefined;

        const expectedTokenRow = await admin
          .from("integration_secrets")
          .select("value")
          .eq("key", "ticto_webhook_token")
          .maybeSingle();

        const expectedToken = expectedTokenRow.data?.value;
        const incomingToken = extractToken(payload);

        if (!expectedToken || !incomingToken || incomingToken !== expectedToken) {
          if (logId) {
            await admin
              .from("webhook_events_log")
              .update({ note: "token inválido ou ausente — verificar formato do payload" })
              .eq("id", logId);
          }
          return json({ ok: false, reason: "invalid_token" }, 401);
        }

        const email = extractEmail(payload);
        const statusText = extractStatusText(payload);
        const mappedStatus = mapStatus(statusText);

        if (!email || !mappedStatus) {
          if (logId) {
            await admin
              .from("webhook_events_log")
              .update({
                note: `sem email ou status reconhecido (statusText="${statusText}", email="${email}")`,
              })
              .eq("id", logId);
          }
          return json({ ok: true, note: "received_but_unmatched" });
        }

        const { data: userList } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
        const matchedUser = userList?.users.find((u) => u.email?.toLowerCase() === email);

        if (!matchedUser) {
          if (logId) {
            await admin
              .from("webhook_events_log")
              .update({ note: `nenhum usuário Gestto encontrado com o e-mail ${email}` })
              .eq("id", logId);
          }
          return json({ ok: true, note: "user_not_found" });
        }

        const { data: membership } = await admin
          .from("memberships")
          .select("company_id")
          .eq("user_id", matchedUser.id)
          .eq("role", "owner")
          .maybeSingle();

        if (!membership) {
          if (logId) {
            await admin
              .from("webhook_events_log")
              .update({ note: `usuário ${email} encontrado, mas sem empresa como dono` })
              .eq("id", logId);
          }
          return json({ ok: true, note: "no_company_owned" });
        }

        await admin
          .from("subscriptions")
          .update({ status: mappedStatus, updated_at: new Date().toISOString() })
          .eq("company_id", membership.company_id);

        if (logId) {
          await admin
            .from("webhook_events_log")
            .update({
              matched_company_id: membership.company_id,
              note: `assinatura atualizada para "${mappedStatus}"`,
            })
            .eq("id", logId);
        }

        return json({ ok: true, status: mappedStatus });
      },
    },
  },
});
