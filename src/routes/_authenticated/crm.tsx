import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Minus, MessageCircle, Plus, Search, Star, Trash2, UserPlus, Users, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useGestto } from "@/hooks/use-gestto";
import { brl, dateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MethodIcon, methodMeta } from "@/components/payment-method-badge";

export const Route = createFileRoute("/_authenticated/crm")({
  head: () => ({
    meta: [
      { title: "Clientes (CRM) — Gestto" },
      { name: "description", content: "Cadastre clientes, acompanhe compras, fidelidade e quem sumiu." },
      { property: "og:title", content: "Clientes (CRM) — Gestto" },
      { property: "og:description", content: "Cadastre clientes, acompanhe compras, fidelidade e quem sumiu." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CrmPage,
});

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  tags: string[];
  loyalty_points: number;
  notes: string | null;
  created_at: string;
};

const PRESET_TAGS = ["VIP", "Atacado", "Novo"];
const DAY = 86_400_000;

function tagClass(tag: string) {
  if (tag === "VIP") return "bg-warning-soft text-warning-foreground";
  if (tag === "Atacado") return "bg-primary-soft text-primary";
  if (tag === "Novo") return "bg-success-soft text-success";
  return "bg-secondary text-secondary-foreground";
}

const digits = (s: string | null) => (s ?? "").replace(/\D/g, "");

function WhatsLink({ phone }: { phone: string | null }) {
  const d = digits(phone);
  if (!d) return null;
  return (
    <a
      href={`https://wa.me/55${d}`}
      target="_blank"
      rel="noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="inline-flex size-7 items-center justify-center rounded-full bg-success-soft text-success hover:opacity-80"
      aria-label="Abrir WhatsApp"
    >
      <MessageCircle className="size-3.5" />
    </a>
  );
}

function TagEditor({ value, onChange }: { value: string[]; onChange: (t: string[]) => void }) {
  const [draft, setDraft] = useState("");
  const toggle = (t: string) => onChange(value.includes(t) ? value.filter((x) => x !== t) : [...value, t]);
  const extra = value.filter((t) => !PRESET_TAGS.includes(t));
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {[...PRESET_TAGS, ...extra].map((t) => (
          <button
            type="button"
            key={t}
            onClick={() => toggle(t)}
            className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
              value.includes(t) ? tagClass(t) : "border border-border text-muted-foreground"
            }`}
          >
            {t}
            {value.includes(t) && !PRESET_TAGS.includes(t) && <X className="ml-1 inline size-3" />}
          </button>
        ))}
      </div>
      <Input
        value={draft}
        placeholder="Outra tag + Enter"
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            const t = draft.trim();
            if (t && !value.includes(t)) onChange([...value, t]);
            setDraft("");
          }
        }}
      />
    </div>
  );
}

function CrmPage() {
  const { session, can } = useGestto();
  const companyId = session?.companyId;
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["customers", companyId, "crm"],
    enabled: !!companyId,
    queryFn: async () => {
      const [{ data: cs, error }, { data: sales, error: e2 }] = await Promise.all([
        supabase
          .from("customers")
          .select("id, name, phone, email, tags, loyalty_points, notes, created_at")
          .eq("company_id", companyId!)
          .order("name"),
        supabase
          .from("sales")
          .select("customer_id, created_at")
          .eq("company_id", companyId!)
          .not("customer_id", "is", null)
          .neq("status", "canceled"),
      ]);
      if (error) throw error;
      if (e2) throw e2;
      const last: Record<string, string> = {};
      for (const s of sales ?? []) {
        const id = s.customer_id as string;
        if (!last[id] || s.created_at > last[id]) last[id] = s.created_at;
      }
      return { customers: (cs ?? []) as Customer[], last };
    },
  });

  const customers = data?.customers ?? [];
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const qd = digits(q);
    if (!q) return customers;
    return customers.filter(
      (c) => c.name.toLowerCase().includes(q) || (qd && digits(c.phone).includes(qd)),
    );
  }, [customers, search]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["customers", companyId] });

  if (!can("crm")) {
    return <p className="text-sm text-muted-foreground">Você não tem acesso ao módulo de CRM.</p>;
  }

  const selected = customers.find((c) => c.id === selectedId) ?? null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Clientes</h1>
          <p className="text-sm text-muted-foreground">
            {customers.length} cliente(s) cadastrado(s). Veja quem compra e quem sumiu.
          </p>
        </div>
        {can("crm", "create") && (
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <UserPlus className="size-4" /> Novo cliente
          </Button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Buscar por nome ou telefone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="surface divide-y divide-border">
        {isLoading ? (
          <p className="p-6 text-sm text-muted-foreground">Carregando...</p>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-10 text-center">
            <span className="flex size-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <Users className="size-5" />
            </span>
            <p className="font-medium">{customers.length ? "Nenhum cliente encontrado" : "Nenhum cliente ainda"}</p>
            <p className="text-sm text-muted-foreground">Cadastre clientes para acompanhar compras e fidelidade.</p>
          </div>
        ) : (
          filtered.map((c) => {
            const lastAt = data?.last[c.id];
            const ref = lastAt ?? c.created_at;
            const days = Math.floor((Date.now() - new Date(ref).getTime()) / DAY);
            const missing = days > 45;
            return (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className="flex w-full items-center gap-3 p-4 text-left transition hover:bg-muted/40"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-soft font-display font-semibold text-primary">
                  {c.name.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="truncate font-medium">{c.name}</p>
                    {missing && (
                      <Badge className="border-0 bg-warning-soft text-warning-foreground hover:bg-warning-soft">Sumido</Badge>
                    )}
                    {c.tags.map((t) => (
                      <span key={t} className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${tagClass(t)}`}>
                        {t}
                      </span>
                    ))}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                    {c.phone && <span className="num">{c.phone}</span>}
                    <WhatsLink phone={c.phone} />
                    <span>
                      {lastAt ? (days === 0 ? "Comprou hoje" : `Última compra há ${days} dia(s)`) : "Nunca comprou"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-sm font-semibold">
                  <Star className="size-4 text-warning" />
                  <span className="num">{c.loyalty_points}</span>
                </div>
              </button>
            );
          })
        )}
      </div>

      <CreateCustomerDialog open={createOpen} onOpenChange={setCreateOpen} companyId={companyId} onDone={invalidate} />
      {selected && (
        <CustomerDetail
          customer={selected}
          onClose={() => setSelectedId(null)}
          onChanged={invalidate}
        />
      )}
    </div>
  );
}

function CreateCustomerDialog({
  open,
  onOpenChange,
  companyId,
  onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  companyId?: string;
  onDone: () => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [tags, setTags] = useState<string[]>(["Novo"]);

  const create = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("O nome é obrigatório");
      const { error } = await supabase.from("customers").insert({
        company_id: companyId!,
        name: name.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
        tags,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cliente cadastrado");
      onDone();
      onOpenChange(false);
      setName(""); setPhone(""); setEmail(""); setTags(["Novo"]);
    },
    onError: (e: Error) => toast.error("Erro ao cadastrar", { description: e.message }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo cliente</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Nome *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Telefone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-9999" />
            </div>
            <div className="space-y-1.5">
              <Label>E-mail</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Tags</Label>
            <TagEditor value={tags} onChange={setTags} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => create.mutate()} disabled={create.isPending}>Cadastrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CustomerDetail({
  customer,
  onClose,
  onChanged,
}: {
  customer: Customer;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { can } = useGestto();
  const canEdit = can("crm", "edit");
  const [form, setForm] = useState(customer);
  useEffect(() => setForm(customer), [customer]);

  const { data: history = [] } = useQuery({
    queryKey: ["customer-sales", customer.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select("id, created_at, gross_amount, method, status")
        .eq("customer_id", customer.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("O nome é obrigatório");
      const { error } = await supabase
        .from("customers")
        .update({
          name: form.name.trim(),
          phone: form.phone?.trim() || null,
          email: form.email?.trim() || null,
          tags: form.tags,
          loyalty_points: Math.max(0, Math.round(Number(form.loyalty_points) || 0)),
          notes: form.notes || null,
        })
        .eq("id", customer.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Cliente atualizado"); onChanged(); },
    onError: (e: Error) => toast.error("Erro ao salvar", { description: e.message }),
  });

  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("customers").delete().eq("id", customer.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Cliente excluído"); onChanged(); onClose(); },
    onError: (e: Error) => toast.error("Erro ao excluir", { description: e.message }),
  });

  const total = history.filter((s) => s.status !== "canceled").reduce((a, s) => a + Number(s.gross_amount), 0);
  const setPts = (n: number) => setForm({ ...form, loyalty_points: Math.max(0, n) });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">{customer.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input disabled={!canEdit} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-2">Telefone <WhatsLink phone={form.phone} /></Label>
                <Input disabled={!canEdit} value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>E-mail</Label>
                <Input disabled={!canEdit} value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Tags</Label>
            {canEdit ? (
              <TagEditor value={form.tags} onChange={(tags) => setForm({ ...form, tags })} />
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {form.tags.map((t) => (
                  <span key={t} className={`rounded-full px-2.5 py-1 text-xs font-medium ${tagClass(t)}`}>{t}</span>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Pontos de fidelidade</Label>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" disabled={!canEdit} onClick={() => setPts(form.loyalty_points - 1)}>
                <Minus className="size-4" />
              </Button>
              <Input
                className="num w-24 text-center"
                type="number"
                disabled={!canEdit}
                value={form.loyalty_points}
                onChange={(e) => setPts(Number(e.target.value) || 0)}
              />
              <Button variant="outline" size="icon" disabled={!canEdit} onClick={() => setPts(form.loyalty_points + 1)}>
                <Plus className="size-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Notas</Label>
            <Textarea
              disabled={!canEdit}
              rows={3}
              value={form.notes ?? ""}
              placeholder="Preferências, aniversário, observações..."
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Histórico de compras</Label>
              <span className="text-xs text-muted-foreground">
                {history.length} compra(s) · <span className="num font-semibold text-foreground">{brl(total)}</span>
              </span>
            </div>
            <div className="max-h-56 divide-y divide-border overflow-y-auto rounded-lg border border-border">
              {history.length === 0 ? (
                <p className="p-3 text-sm text-muted-foreground">Nenhuma compra vinculada ainda.</p>
              ) : (
                history.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 p-2.5">
                    <MethodIcon method={s.method} className="size-8" />
                    <div className="flex-1 text-sm">
                      <p className="font-medium">{methodMeta(s.method).label}</p>
                      <p className="text-xs text-muted-foreground">{dateTime(s.created_at)}</p>
                    </div>
                    <span className={`num text-sm font-semibold ${s.status === "canceled" ? "line-through text-muted-foreground" : ""}`}>
                      {brl(Number(s.gross_amount))}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          {can("crm", "delete") ? (
            <Button
              variant="ghost"
              className="gap-2 text-destructive hover:text-destructive"
              disabled={remove.isPending}
              onClick={() => { if (confirm("Excluir este cliente?")) remove.mutate(); }}
            >
              <Trash2 className="size-4" /> Excluir
            </Button>
          ) : <span />}
          {canEdit && (
            <Button onClick={() => save.mutate()} disabled={save.isPending}>Salvar alterações</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
