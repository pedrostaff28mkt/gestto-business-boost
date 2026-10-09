// Único ponto de contato com o provedor de IA. Para trocar de provedor
// (OpenAI/Anthropic com chave própria), mude só este arquivo: URL, chave e modelo.
// Somente servidor — nunca importe no navegador.

const BASE_URL = "https://ai.gateway.lovable.dev/v1";
// Modelo barato e rápido com suporte a function calling no gateway.
const MODEL = "openai/gpt-5.6-luna";

export type ChatMessage =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: ToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

export type ToolCall = { id: string; type: "function"; function: { name: string; arguments: string } };

export type ToolDef = {
  type: "function";
  function: { name: string; description: string; parameters: Record<string, unknown> };
};

export class ProviderError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function callModel({
  messages,
  tools,
  maxTokens,
}: {
  messages: ChatMessage[];
  tools: ToolDef[];
  maxTokens: number;
}): Promise<{ content: string | null; toolCalls: ToolCall[] }> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new ProviderError(500, "missing_key");

  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      ...(tools.length ? { tools, tool_choice: "auto" } : {}),
      // gpt-5.6-luna exige reasoning_effort "none" ao usar ferramentas.
      reasoning_effort: "none",
      max_completion_tokens: maxTokens,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[ai-provider]", res.status, body.slice(0, 500));
    throw new ProviderError(res.status, "provider_error");
  }
  const data = (await res.json()) as {
    choices?: { message?: { content?: string | null; tool_calls?: ToolCall[] } }[];
  };
  const msg = data.choices?.[0]?.message;
  return { content: msg?.content ?? null, toolCalls: msg?.tool_calls ?? [] };
}
