import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Users, Copy, Link2, Check, Loader2, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useGestto, roleLabels, type AppModule, type AppRole } from "@/hooks/use-gestto";
import { usePaywall } from "@/components/paywall";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/_authenticated/equipe")({
  head: () => ({
    meta: [
      { title: "Equipe — Gestto" },
      { name: "description", content: "Convide gerentes, vendedores e produção com permissões por módulo." },
      { property: "og:title", content: "Equipe — Gestto" },
      { property: "og:description", content: "Gerencie sua equipe e permissões por módulo no Gestto." },
    ],
  }),
  component: EquipePage,
});

const MODULES: { key: AppModule; label: string }[] = [
  { key: "dashboard", label: "Início" },
  { key: "sales", label: "Vendas" },
  { key: "inventory", label: "Estoque" },
  { key: "finance", label: "Financeiro" },
  { key: "team", label: "Equipe" },
  { key: "ai", label: "IA" },
  { key: "crm", label: "CRM" },
  { key: "integrations", label: "Integrações" },
  { key: "settings", label: "Ajustes" },
];

const INVITE_ROLES: AppRole[] = ["manager", "seller", "production"];

type PermMap = Record<AppModule, { can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean }>;

function defaultsFor(role: AppRole): PermMap {
  const map = {} as PermMap;
  for (const m of MODULES) {
    const view =
      role === "manager"
        ? m.key !== "settings"
        : role === "seller"
          ? ["sales", "inventory", "crm", "dashboard"].includes(m.key)
          : ["inventory", "team"].includes(m.key);
    const create =
      role === "manager"
        ? m.key !== "settings"
        : role === "seller"
          ? ["sales", "crm"].includes(m.key)
          : m.key === "inventory";
    map[m.key] = {
      can_view: view,
      can_create: create,
      can_edit: role === "manager",
      can_delete: false,
    };
  }
  return map;
}

function InviteForm({ companyId }: { companyId: string }) {
  const queryClient = useQueryClient();
  const { guard, locked } = usePaywall();
  const [role, setRole] = useState<AppRole>("seller");
  const [perms, setPerms] = useState<PermMap>(() => defaultsFor("seller"));
  const [form, setForm] = useState({ fullName: "", email: "" });

  function pickRole(r: AppRole) {
    setRole(r);
    setPerms(defaultsFor(r));
  }

  const create = useMutation({
    mutationFn: async () => {
      const module_permissions = MODULES.map((m) => ({ module: m.key, ...perms[m.key] }));
      const { data, error } = await supabase
        .from("invites")
        .insert({
          company_id: companyId,
          role,
          full_name: form.fullName.trim() || null,
          email: form.email.trim() || null,
          module_permissions,
        })
        .select("code")
        .single();
      if (error) throw error;
      return data.code as string;
    },
    onSuccess: () => {
      setForm({ fullName: "", email: "" });
      queryClient.invalidateQueries({ queryKey: ["invites"] });
      toast.success("Convite criado! Copie o link e envie pelo WhatsApp.");
    },
    onError: (e: Error) => toast.error("Não foi possível criar o convite", { description: e.message }),
  });

  return (
    <section className="surface p-5">
      <div className="flex items-center gap-2">
        <UserPlus className="size-4 text-primary" />
        <h2 className="font-display text-lg font-semibold">Convidar pessoa</h2>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {INVITE_ROLES.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => pickRole(r)}
            className={`rounded-xl border p-3 text-left text-sm transition-colors ${
              role === r ? "border-primary bg-primary-soft" : "border-border hover:bg-secondary"
            }`}
          >
            {roleLabels[r]}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="inviteName">Nome</Label>
          <Input
            id="inviteName"
            value={form.fullName}
            onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
            placeholder="João Souza"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="inviteEmail">E-mail (opcional)</Label>
          <Input
            id="inviteEmail"
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="joao@empresa.com.br"
          />
        </div>
      </div>

      <div className="mt-5">
        <Label className="mb-2 block">Permissões por módulo</Label>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Módulo</th>
                {["Ver", "Criar", "Editar", "Excluir"].map((h) => (
                  <th key={h} className="px-3 py-2 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MODULES.map((m) => (
                <tr key={m.key} className="border-t border-border">
                  <td className="px-3 py-2">{m.label}</td>
                  {(["can_view", "can_create", "can_edit", "can_delete"] as const).map((k) => (
                    <td key={k} className="px-3 py-2 text-center">
                      <Checkbox
                        checked={perms[m.key][k]}
                        onCheckedChange={(v) =>
                          setPerms((p) => ({ ...p, [m.key]: { ...p[m.key], [k]: v === true } }))
                        }
                        aria-label={`${m.label} ${k}`}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Button
        className="mt-5 w-full"
        size="lg"
        disabled={create.isPending}
        onClick={() => guard(() => create.mutate())}
      >
        {create.isPending && <Loader2 className="size-4 animate-spin" />}
        Gerar link de convite
      </Button>
      {locked && (
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Ative a assinatura para enviar convites.
        </p>
      )}
    </section>
  );
}

function InviteList({ companyId }: { companyId: string }) {
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState<string | null>(null);

  const { data: invites = [], isLoading } = useQuery({
    queryKey: ["invites", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invites")
        .select("id, code, role, full_name, email, expires_at, used_at, created_at")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("invites").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invites"] });
      toast.success("Convite removido");
    },
  });

  const origin = typeof window === "undefined" ? "" : window.location.origin;

  async function copy(code: string) {
    const url = `${origin}/convite/${code}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(code);
      setTimeout(() => setCopied(null), 2000);
      toast.success("Link copiado", { description: url });
    } catch {
      toast.error("Copie manualmente", { description: url });
    }
  }

  return (
    <section className="surface p-5">
      <h2 className="font-display text-lg font-semibold">Convites</h2>
      {isLoading ? (
        <p className="mt-3 text-sm text-muted-foreground">Carregando…</p>
      ) : invites.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">Nenhum convite criado ainda.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {invites.map((i) => {
            const used = !!i.used_at;
            const expired = !used && new Date(i.expires_at).getTime() < Date.now();
            return (
              <li key={i.id} className="rounded-xl border border-border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {i.full_name || i.email || "Convite sem nome"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {roleLabels[i.role as AppRole]}
                      {i.email ? ` · ${i.email}` : ""}
                    </p>
                  </div>
                  <Badge variant={used ? "secondary" : expired ? "outline" : "default"}>
                    {used ? "Usado" : expired ? "Expirado" : "Pendente"}
                  </Badge>
                </div>
                {!used && !expired && (
                  <div className="mt-3 flex items-center gap-2">
                    <Button variant="secondary" size="sm" className="gap-2" onClick={() => copy(i.code)}>
                      {copied === i.code ? <Check className="size-4" /> : <Copy className="size-4" />}
                      Copiar link
                    </Button>
                    <Button asChild variant="ghost" size="sm" className="gap-2">
                      <a href={`/convite/${i.code}`} target="_blank" rel="noreferrer">
                        <Link2 className="size-4" /> Abrir
                      </a>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="ml-auto text-muted-foreground"
                      aria-label="Remover convite"
                      onClick={() => remove.mutate(i.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function MemberList({ companyId }: { companyId: string }) {
  const { data: members = [] } = useQuery({
    queryKey: ["members", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("memberships")
        .select("id, role, active, user_id, profiles:user_id(full_name)")
        .eq("company_id", companyId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as unknown as {
        id: string;
        role: AppRole;
        active: boolean;
        profiles: { full_name: string } | null;
      }[];
    },
  });

  return (
    <section className="surface p-5">
      <h2 className="font-display text-lg font-semibold">Pessoas na empresa</h2>
      <ul className="mt-3 divide-y divide-border">
        {members.map((m) => (
          <li key={m.id} className="flex items-center justify-between gap-3 py-2.5">
            <span className="truncate text-sm">{m.profiles?.full_name || "Sem nome"}</span>
            <Badge variant="secondary">{roleLabels[m.role]}</Badge>
          </li>
        ))}
      </ul>
    </section>
  );
}

function EquipePage() {
  const { session, can } = useGestto();
  const companyId = session?.companyId;
  const canInvite = useMemo(() => can("team", "create"), [can]);

  if (!companyId) return null;

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-2">
        <Users className="size-5 text-primary" />
        <h1 className="font-display text-2xl font-bold">Equipe</h1>
      </header>

      <MemberList companyId={companyId} />

      {canInvite ? (
        <>
          <InviteForm companyId={companyId} />
          <InviteList companyId={companyId} />
        </>
      ) : (
        <p className="surface p-5 text-sm text-muted-foreground">
          Só o dono ou gerente com permissão pode convidar novas pessoas.
        </p>
      )}
    </div>
  );
}
