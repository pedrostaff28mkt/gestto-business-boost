// Filtros da IA do Gestto. ATENÇÃO: são apenas a PRIMEIRA linha de defesa
// (heurísticas simples). A barreira real entre empresas é estrutural: as
// ferramentas rodam com o JWT do usuário + RLS e a empresa é validada no servidor.

const normalize = (t: string) =>
  t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ");

const BLOCK_PATTERNS: RegExp[] = [
  // ignorar/esquecer instruções ou regras
  /\b(ignor\w*|esquec\w*|desconsider\w*|ignore|forget|disregard)\b.{0,40}\b(instruc\w*|regras?|ordens|diretrizes|instructions?|rules)\b/,
  // extração de prompt/instruções
  /system ?prompt|prompt (do|de) sistema|prompt inicial|\bseu prompt\b/,
  /\b(suas|tuas|as suas) (instrucoes|regras|diretrizes)\b|instrucoes (internas|ocultas|originais|iniciais)/,
  /repit\w* (o|todo o) texto (acima|anterior)|repeat (the )?(text|everything) above/,
  // modos especiais
  /modo (desenvolvedor|dev|admin|administrador|debug|deus)|developer mode|\bdan mode\b|jailbreak/,
  // segredos e internos
  /api[ _-]?key|service[ _-]?role|chave (secreta|de api|da api|privada)|token (de acesso|secreto|jwt)|access token|\bjwt\b/,
  /supabase|lovable|variave\w* de ambiente|environment variables?|(^|\s)\.env\b/,
  // outras empresas / clientes do Gestto
  /\b(outra|outras|demais) (empresas?|companhias?)\b/,
  /\b(de|da|das|do|dos) outros? (clientes do gestto|empresas?)\b/,
  /todas as (empresas|companhias)/,
  /quant[oa]s (clientes|empresas|usuarios|assinantes) (o|a) gestto/,
  /clientes do gestto|usuarios do gestto|assinantes do gestto/,
  // alegação de ser da equipe
  /\b(sou|somos|trabalho|faco parte) (da|do|na|no|de) (equipe|time|suporte)? ?(do |da )?(gestto|anthropic|openai|lovable)\b/,
];

export function isBlockedQuestion(text: string): boolean {
  const t = normalize(text);
  return BLOCK_PATTERNS.some((re) => re.test(t));
}

export function sanitizeReply(text: string): string {
  return text
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, "[removido]")
    .replace(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g, "[removido]")
    .replace(/\bsb_(publishable|secret)_[\w-]+/g, "[removido]")
    .replace(/\bsk-[\w-]{8,}/g, "[removido]");
}
