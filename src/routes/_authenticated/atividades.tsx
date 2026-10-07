import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ListChecks, CheckCircle2, Loader2, CalendarDays, Plus, MessageCircle, ImagePlus, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useGestto } from "@/hooks/use-gestto";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/atividades")({
  head: () => ({
    meta: [
      { title: "Atividades — Gestto" },
      { name: "description", content: "Atribua e acompanhe as atividades da sua equipe." },
      { property: "og:title", content: "Atividades — Gestto" },
      { property: "og:description", content: "Tarefas da equipe organizadas, com prazo, frequência e foto." },
    ],
  }),
  component: AtividadesPage,
});

type Frequency = "once" | "daily" | "weekly";
type Task = {
  id: string;
  title: string;
  description: string | null;
  observations: string | null;
  photo_url: string | null;
  due_date: string | null;
  frequency: Frequency;
  status: "pending" | "done";
  completed_at: string | null;
  assigned_to: string;
};

const FREQ_LABEL: Record<Frequency, string> = { once: "Pontual", daily: "Diária", weekly: "Semanal" };
const TASK_COLS = "id, title, description, observations, photo_url, due_date, frequency, status, completed_at, assigned_to";

const fmtDue = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("pt-BR");
const isOverdue = (t: Task) => {
  if (t.status !== "pending" || !t.due_date) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(t.due_date + "T00:00:00") < today;
};

function TaskCard({ task, onComplete, completing }: { task: Task; onComplete?: () => void; completing?: boolean }) {
  const [zoom, setZoom] = useState(false);
  const overdue = isOverdue(task);
  return (
    <li className="rounded-xl border border-border p-4">
      <div className="flex gap-3">
        {task.photo_url && (
          <button type="button" onClick={() => setZoom(true)} className="shrink-0" aria-label="Ampliar foto">
            <img src={task.photo_url} alt="" className="size-16 rounded-lg object-cover" loading="lazy" />
          </button>
        )}
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{task.title}</p>
            <Badge variant="secondary">{FREQ_LABEL[task.frequency]}</Badge>
            {task.status === "done" && (
              <Badge className="bg-success/10 text-success hover:bg-success/10">Concluída</Badge>
            )}
          </div>
          {task.due_date && (
            <p className={`flex items-center gap-1 text-xs ${overdue ? "font-medium text-chart-3" : "text-muted-foreground"}`}>
              <CalendarDays className="size-3" /> Prazo {fmtDue(task.due_date)}
              {overdue && " · vencida"}
            </p>
          )}
          {task.description && <p className="text-sm">{task.description}</p>}
          {task.observations && (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium">Obs.:</span> {task.observations}
            </p>
          )}
        </div>
      </div>
      {onComplete && task.status === "pending" && (
        <Button size="sm" className="mt-3 w-full sm:w-auto" onClick={onComplete} disabled={completing}>
          {completing ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
          Marcar como concluída
        </Button>
      )}
      {task.photo_url && (
        <Dialog open={zoom} onOpenChange={setZoom}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>{task.title}</DialogTitle>
            </DialogHeader>
            <img src={task.photo_url} alt={task.title} className="max-h-[75vh] w-full rounded-lg object-contain" />
          </DialogContent>
        </Dialog>
      )}
    </li>
  );
}

function MyTasks() {
  const { session } = useGestto();
  const queryClient = useQueryClient();
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["my-tasks", session?.companyId, session?.userId],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select(TASK_COLS)
        .eq("company_id", session!.companyId)
        .eq("assigned_to", session!.userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Task[];
    },
  });

  const complete = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("tasks")
        .update({ status: "done", completed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Atividade concluída");
      queryClient.invalidateQueries({ queryKey: ["my-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["member-tasks"] });
    },
    onError: (e: Error) => toast.error("Não foi possível concluir", { description: e.message }),
  });

  const pending = tasks.filter((t) => t.status === "pending");
  const done = tasks.filter((t) => t.status === "done");

  return (
    <section className="surface p-5">
      <div className="flex items-center gap-2">
        <ListChecks className="size-4 text-primary" />
        <h2 className="font-display text-lg font-semibold">Minhas atividades</h2>
      </div>
      {isLoading ? (
        <Loader2 className="mt-4 size-4 animate-spin text-muted-foreground" />
      ) : (
        <Tabs defaultValue="pending" className="mt-4">
          <TabsList>
            <TabsTrigger value="pending">Pendentes ({pending.length})</TabsTrigger>
            <TabsTrigger value="done">Concluídas ({done.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="pending">
            {pending.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">Nenhuma atividade pendente. 🎉</p>
            ) : (
              <ul className="space-y-3">
                {pending.map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    onComplete={() => complete.mutate(t.id)}
                    completing={complete.isPending && complete.variables === t.id}
                  />
                ))}
              </ul>
            )}
          </TabsContent>
          <TabsContent value="done">
            {done.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">Nenhuma atividade concluída ainda.</p>
            ) : (
              <ul className="space-y-3">
                {done.map((t) => (
                  <TaskCard key={t.id} task={t} />
                ))}
              </ul>
            )}
          </TabsContent>
        </Tabs>
      )}
    </section>
  );
}

type Member = { userId: string; name: string; phone: string | null; email: string | null };

function MemberTasksDialog({ member, companyId, onClose }: { member: Member | null; companyId: string; onClose: () => void }) {
  const { session } = useGestto();
  const queryClient = useQueryClient();
  const empty = { title: "", description: "", observations: "", due_date: "", frequency: "once" as Frequency };
  const [form, setForm] = useState(empty);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!photo) return setPreview(null);
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  useEffect(() => {
    setForm(empty);
    setPhoto(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [member?.userId]);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["member-tasks", companyId, member?.userId],
    enabled: !!member,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select(TASK_COLS)
        .eq("company_id", companyId)
        .eq("assigned_to", member!.userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Task[];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!form.title.trim()) throw new Error("Informe o título da atividade.");
      let photo_url: string | null = null;
      if (photo) {
        const safe = photo.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${companyId}/${crypto.randomUUID()}-${safe}`;
        const up = await supabase.storage.from("task-photos").upload(path, photo, { contentType: photo.type });
        if (up.error) throw new Error("Falha ao enviar a foto: " + up.error.message);
        photo_url = supabase.storage.from("task-photos").getPublicUrl(path).data.publicUrl;
      }
      const { error } = await supabase.from("tasks").insert({
        company_id: companyId,
        assigned_to: member!.userId,
        assigned_by: session!.userId,
        title: form.title.trim().slice(0, 200),
        description: form.description.trim() || null,
        observations: form.observations.trim() || null,
        due_date: form.due_date || null,
        frequency: form.frequency,
        photo_url,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Atividade atribuída");
      setForm(empty);
      setPhoto(null);
      queryClient.invalidateQueries({ queryKey: ["member-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["my-tasks"] });
    },
    onError: (e: Error) => toast.error("Não foi possível salvar", { description: e.message }),
  });

  return (
    <Dialog open={!!member} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Atividades de {member?.name}</DialogTitle>
        </DialogHeader>

        <div>
          <p className="text-sm font-medium">Atribuídas</p>
          {isLoading ? (
            <Loader2 className="mt-2 size-4 animate-spin text-muted-foreground" />
          ) : tasks.length === 0 ? (
            <p className="mt-1 text-sm text-muted-foreground">Nenhuma atividade atribuída ainda.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {tasks.map((t) => (
                <TaskCard key={t.id} task={t} />
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-3 border-t border-border pt-4">
          <p className="flex items-center gap-1.5 text-sm font-medium">
            <Plus className="size-4 text-primary" /> Nova atividade
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="taskTitle">Título</Label>
            <Input id="taskTitle" maxLength={200} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="taskDesc">Descrição (opcional)</Label>
            <Textarea id="taskDesc" maxLength={2000} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="taskObs">Observações (opcional)</Label>
            <Textarea id="taskObs" maxLength={2000} value={form.observations} onChange={(e) => setForm((f) => ({ ...f, observations: e.target.value }))} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="taskDue">Prazo (opcional)</Label>
              <Input id="taskDue" type="date" value={form.due_date} onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Frequência</Label>
              <Select value={form.frequency} onValueChange={(v) => setForm((f) => ({ ...f, frequency: v as Frequency }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="once">Pontual</SelectItem>
                  <SelectItem value="daily">Diária</SelectItem>
                  <SelectItem value="weekly">Semanal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Foto (opcional)</Label>
            {preview ? (
              <div className="relative inline-block">
                <img src={preview} alt="" className="size-24 rounded-lg object-cover" />
                <button
                  type="button"
                  onClick={() => setPhoto(null)}
                  className="absolute -right-2 -top-2 rounded-full bg-background p-1 shadow"
                  aria-label="Remover foto"
                >
                  <X className="size-3" />
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border p-3 text-sm text-muted-foreground hover:bg-secondary">
                <ImagePlus className="size-4" /> Escolher foto
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    if (!f.type.startsWith("image/")) return toast.error("Envie um arquivo de imagem");
                    if (f.size > 3 * 1024 * 1024) return toast.error("A foto deve ter no máximo 3MB");
                    setPhoto(f);
                  }}
                />
              </label>
            )}
          </div>
          <Button className="w-full" onClick={() => create.mutate()} disabled={create.isPending || !form.title.trim()}>
            {create.isPending && <Loader2 className="size-4 animate-spin" />} Atribuir atividade
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ManageTeam({ companyId }: { companyId: string }) {
  const [selected, setSelected] = useState<Member | null>(null);
  const { data: members = [], isLoading } = useQuery({
    queryKey: ["tasks-members", companyId],
    queryFn: async () => {
      const [{ data: ms, error }, { data: inv }] = await Promise.all([
        supabase
          .from("memberships")
          .select("user_id, profiles:user_id(full_name, phone)")
          .eq("company_id", companyId)
          .eq("active", true),
        supabase.from("invites").select("used_by, email").eq("company_id", companyId).not("used_by", "is", null),
      ]);
      if (error) throw error;
      return (ms as unknown as { user_id: string; profiles: { full_name: string; phone: string | null } | null }[]).map(
        (m) => ({
          userId: m.user_id,
          name: m.profiles?.full_name || "Sem nome",
          phone: m.profiles?.phone ?? null,
          email: inv?.find((i) => i.used_by === m.user_id)?.email ?? null,
        }),
      );
    },
  });

  return (
    <section className="surface p-5">
      <h2 className="font-display text-lg font-semibold">Atribuir e acompanhar</h2>
      <p className="text-sm text-muted-foreground">Clique em uma pessoa para ver e atribuir atividades.</p>
      {isLoading ? (
        <Loader2 className="mt-4 size-4 animate-spin text-muted-foreground" />
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {members.map((m) => {
            const digits = m.phone?.replace(/\D/g, "") ?? "";
            const wa = digits ? (digits.startsWith("55") ? digits : `55${digits}`) : null;
            return (
              <li key={m.userId} className="flex items-center justify-between gap-3 py-2.5">
                <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setSelected(m)}>
                  <span className="block truncate text-sm font-medium hover:text-primary">{m.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {[m.email, m.phone].filter(Boolean).join(" · ") || "Sem contato cadastrado"}
                  </span>
                </button>
                {wa && (
                  <Button asChild variant="ghost" size="icon" className="text-success">
                    <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" aria-label={`WhatsApp de ${m.name}`}>
                      <MessageCircle className="size-4" />
                    </a>
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => setSelected(m)}>
                  Atividades
                </Button>
              </li>
            );
          })}
        </ul>
      )}
      <MemberTasksDialog member={selected} companyId={companyId} onClose={() => setSelected(null)} />
    </section>
  );
}

function AtividadesPage() {
  const { session, can } = useGestto();
  if (!session) return null;
  const canManage = can("tasks", "create");
  return (
    <div className="space-y-4">
      <header className="flex items-center gap-2">
        <ListChecks className="size-5 text-primary" />
        <h1 className="font-display text-2xl font-bold">Atividades</h1>
      </header>
      {canManage ? (
        <Tabs defaultValue="mine">
          <TabsList>
            <TabsTrigger value="mine">Minhas atividades</TabsTrigger>
            <TabsTrigger value="team">Atribuir e acompanhar</TabsTrigger>
          </TabsList>
          <TabsContent value="mine">
            <MyTasks />
          </TabsContent>
          <TabsContent value="team">
            <ManageTeam companyId={session.companyId} />
          </TabsContent>
        </Tabs>
      ) : (
        <MyTasks />
      )}
    </div>
  );
}
