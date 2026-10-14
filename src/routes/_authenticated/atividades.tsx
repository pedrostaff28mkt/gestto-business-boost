import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ListChecks,
  CheckCircle2,
  Circle,
  Loader2,
  CalendarDays,
  Plus,
  MessageCircle,
  ImagePlus,
  X,
  Trash2,
  Undo2,
  Search,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useGestto, roleLabels, type AppRole } from "@/hooks/use-gestto";
import { QueryError } from "@/components/query-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
type BaseTask = {
  id: string;
  title: string;
  description: string | null;
  observations: string | null;
  photo_url: string | null;
  due_date: string | null;
  frequency: Frequency;
  created_at: string;
};
type MyTask = BaseTask & { done_now: boolean; last_completed_at: string | null };
type Assignee = { user_id: string; name: string | null; done_now: boolean; last_completed_at: string | null };
type TeamTask = BaseTask & { assignees: Assignee[] };
type Member = {
  userId: string;
  name: string;
  subtitle: string;
  phone: string | null;
  email: string | null;
  isMe: boolean;
};

const FREQ_LABEL: Record<Frequency, string> = { once: "Pontual", daily: "Diária", weekly: "Semanal" };
const DONE_LABEL: Record<Frequency, string> = {
  once: "Concluída",
  daily: "Concluída hoje",
  weekly: "Concluída esta semana",
};

const fmtDue = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("pt-BR");
const isPastDue = (due: string | null) => {
  if (!due) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(due + "T00:00:00") < today;
};

const rpc = (fn: string, args: Record<string, unknown>) =>
  (supabase.rpc as unknown as (f: string, a: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>)(fn, args);

function PhotoThumb({ url, title }: { url: string; title: string }) {
  const [zoom, setZoom] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setZoom(true)} className="shrink-0" aria-label="Ampliar foto">
        <img src={url} alt="" className="size-16 rounded-lg object-cover" loading="lazy" />
      </button>
      <Dialog open={zoom} onOpenChange={setZoom}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <img src={url} alt={title} className="max-h-[75vh] w-full rounded-lg object-contain" />
        </DialogContent>
      </Dialog>
    </>
  );
}

function TaskBody({ task, overdue }: { task: BaseTask; overdue: boolean }) {
  return (
    <>
      {task.due_date && (
        <p className={`flex items-center gap-1 text-xs ${overdue ? "font-medium text-warning" : "text-muted-foreground"}`}>
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
    </>
  );
}

/* ----------------------------- Minhas atividades ----------------------------- */

function MyTasks() {
  const { session } = useGestto();
  const queryClient = useQueryClient();
  const { data: tasks = [], isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["my-tasks", session?.companyId, session?.userId],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await rpc("my_tasks", { _company_id: session!.companyId });
      if (error) throw new Error(error.message);
      return (data ?? []) as MyTask[];
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["my-tasks"] });
    queryClient.invalidateQueries({ queryKey: ["team-tasks"] });
  };
  const complete = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await rpc("complete_task", { _task_id: id });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Atividade concluída");
      invalidate();
    },
    onError: (e: Error) => toast.error("Não foi possível concluir", { description: e.message }),
  });
  const undo = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await rpc("undo_task_completion", { _task_id: id });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Conclusão desfeita");
      invalidate();
    },
    onError: (e: Error) => toast.error("Não foi possível desfazer", { description: e.message }),
  });

  const pending = tasks.filter((t) => !t.done_now);
  const done = tasks.filter((t) => t.done_now);

  const card = (t: MyTask) => {
    const overdue = !t.done_now && isPastDue(t.due_date);
    return (
      <li key={t.id} className="rounded-xl border border-border p-4">
        <div className="flex gap-3">
          {t.photo_url && <PhotoThumb url={t.photo_url} title={t.title} />}
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium">{t.title}</p>
              <Badge variant="secondary">{FREQ_LABEL[t.frequency]}</Badge>
              {t.done_now && (
                <Badge className="bg-success/10 text-success hover:bg-success/10">{DONE_LABEL[t.frequency]}</Badge>
              )}
            </div>
            <TaskBody task={t} overdue={overdue} />
          </div>
        </div>
        {t.done_now ? (
          <Button
            size="sm"
            variant="ghost"
            className="mt-2 text-muted-foreground"
            onClick={() => undo.mutate(t.id)}
            disabled={undo.isPending && undo.variables === t.id}
          >
            {undo.isPending && undo.variables === t.id ? <Loader2 className="size-4 animate-spin" /> : <Undo2 className="size-4" />}
            Desfazer
          </Button>
        ) : (
          <Button
            size="sm"
            className="mt-3 w-full sm:w-auto"
            onClick={() => complete.mutate(t.id)}
            disabled={complete.isPending && complete.variables === t.id}
          >
            {complete.isPending && complete.variables === t.id ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <CheckCircle2 className="size-4" />
            )}
            Marcar como concluída
          </Button>
        )}
      </li>
    );
  };

  return (
    <section className="surface p-5">
      <div className="flex items-center gap-2">
        <ListChecks className="size-4 text-primary" />
        <h2 className="font-display text-lg font-semibold">Minhas atividades</h2>
      </div>
      {isError ? (
        <QueryError message="Não foi possível carregar suas atividades" error={error} onRetry={() => refetch()} retrying={isFetching} />
      ) : isLoading ? (
        <Loader2 className="mt-4 size-4 animate-spin text-muted-foreground" />
      ) : (
        <div className="mt-4 space-y-5">
          <div>
            <p className="text-sm font-medium">Pendentes ({pending.length})</p>
            {pending.length === 0 ? (
              <p className="py-2 text-sm text-muted-foreground">Nenhuma atividade pendente.</p>
            ) : (
              <ul className="mt-2 space-y-3">{pending.map(card)}</ul>
            )}
          </div>
          <div>
            <p className="text-sm font-medium">Concluídas ({done.length})</p>
            {done.length === 0 ? (
              <p className="py-2 text-sm text-muted-foreground">Nenhuma atividade concluída neste período.</p>
            ) : (
              <ul className="mt-2 space-y-3">{done.map(card)}</ul>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

/* ------------------------------ Nova atividade ------------------------------ */

function NewTaskDialog({
  open,
  onOpenChange,
  companyId,
  members,
  initialSelected,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  companyId: string;
  members: Member[];
  initialSelected: string[];
}) {
  const queryClient = useQueryClient();
  const empty = { title: "", description: "", observations: "", due_date: "", frequency: "once" as Frequency };
  const [form, setForm] = useState(empty);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (open) {
      setForm(empty);
      setPhoto(null);
      setSearch("");
      setSelected(new Set(initialSelected));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!photo) return setPreview(null);
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  const filtered = members.filter((m) => {
    const q = search.trim().toLowerCase();
    return !q || m.name.toLowerCase().includes(q) || m.subtitle.toLowerCase().includes(q);
  });

  const toggle = (id: string, on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  const create = useMutation({
    mutationFn: async () => {
      if (!form.title.trim()) throw new Error("Informe o título da atividade.");
      if (selected.size === 0) throw new Error("Selecione pelo menos 1 pessoa.");
      let photoUrl: string | null = null;
      if (photo) {
        const safe = photo.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${companyId}/${crypto.randomUUID()}-${safe}`;
        const up = await supabase.storage.from("task-photos").upload(path, photo, { contentType: photo.type });
        if (up.error) throw new Error("Falha ao enviar a foto: " + up.error.message);
        photoUrl = supabase.storage.from("task-photos").getPublicUrl(path).data.publicUrl;
      }
      const { error } = await rpc("create_task", {
        _company_id: companyId,
        _title: form.title.trim().slice(0, 200),
        _description: form.description.trim() || null,
        _observations: form.observations.trim() || null,
        _due_date: form.due_date || null,
        _frequency: form.frequency,
        _photo_url: photoUrl,
        _assignee_ids: [...selected],
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Atividade criada");
      queryClient.invalidateQueries({ queryKey: ["team-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["my-tasks"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error("Não foi possível criar a atividade", { description: e.message }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova atividade</DialogTitle>
          <DialogDescription>Defina o que precisa ser feito e quem vai fazer.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="taskTitle">Título *</Label>
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
          <p className="rounded-lg bg-secondary/60 p-2.5 text-xs text-muted-foreground">
            <strong>Pontual:</strong> concluída uma vez, fica concluída. <strong>Diária:</strong> volta a ficar pendente
            todo dia. <strong>Semanal:</strong> volta a ficar pendente toda segunda-feira. Os horários seguem o fuso de
            São Paulo, e cada pessoa conclui a sua parte separadamente.
          </p>

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

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label>Quem vai fazer *</Label>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setSelected(new Set(members.map((m) => m.userId)))}
              >
                Selecionar todos
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Buscar pessoa" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <ul className="max-h-56 divide-y divide-border overflow-y-auto rounded-xl border border-border">
              {filtered.length === 0 ? (
                <li className="p-3 text-sm text-muted-foreground">Ninguém encontrado.</li>
              ) : (
                filtered.map((m) => (
                  <li key={m.userId}>
                    <label className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-secondary/60">
                      <Checkbox checked={selected.has(m.userId)} onCheckedChange={(v) => toggle(m.userId, v === true)} />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">
                          {m.name} {m.isMe && <span className="text-muted-foreground">(você)</span>}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">{m.subtitle}</span>
                      </span>
                    </label>
                  </li>
                ))
              )}
            </ul>
            <p className="num text-xs text-muted-foreground">
              {selected.size} {selected.size === 1 ? "pessoa selecionada" : "pessoas selecionadas"}
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => create.mutate()} disabled={create.isPending || !form.title.trim() || selected.size === 0}>
            {create.isPending && <Loader2 className="size-4 animate-spin" />} Criar atividade
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* --------------------------- Atribuir e acompanhar --------------------------- */

function useCompanyMembers(companyId: string, myId: string) {
  return useQuery({
    queryKey: ["tasks-members", companyId],
    queryFn: async () => {
      const [{ data: ms, error }, { data: inv }] = await Promise.all([
        supabase
          .from("memberships")
          .select("user_id, role, job_title, profiles:user_id(full_name, phone)")
          .eq("company_id", companyId)
          .eq("active", true)
          .order("created_at", { ascending: true }),
        supabase.from("invites").select("used_by, email").eq("company_id", companyId).not("used_by", "is", null),
      ]);
      if (error) throw error;
      return (
        ms as unknown as {
          user_id: string;
          role: AppRole;
          job_title: string | null;
          profiles: { full_name: string | null; phone: string | null } | null;
        }[]
      ).map<Member>((m) => ({
        userId: m.user_id,
        name: m.profiles?.full_name || "Sem nome",
        subtitle: m.job_title || roleLabels[m.role] || "",
        phone: m.profiles?.phone ?? null,
        email: inv?.find((i) => i.used_by === m.user_id)?.email ?? null,
        isMe: m.user_id === myId,
      }));
    },
  });
}

function ManageTeam({ companyId, myId }: { companyId: string; myId: string }) {
  const queryClient = useQueryClient();
  const [person, setPerson] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [preselect, setPreselect] = useState<string[]>([]);
  const [toDelete, setToDelete] = useState<TeamTask | null>(null);

  const membersQ = useCompanyMembers(companyId, myId);
  const members = membersQ.data ?? [];
  const tasksQ = useQuery({
    queryKey: ["team-tasks", companyId],
    queryFn: async () => {
      const { data, error } = await rpc("team_tasks", { _company_id: companyId });
      if (error) throw new Error(error.message);
      return (data ?? []) as TeamTask[];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Atividade apagada");
      setToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["team-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["my-tasks"] });
    },
    onError: (e: Error) => toast.error("Não foi possível apagar", { description: e.message }),
  });

  const tasks = useMemo(() => {
    const all = tasksQ.data ?? [];
    return person === "all" ? all : all.filter((t) => t.assignees?.some((a) => a.user_id === person));
  }, [tasksQ.data, person]);

  const selectedMember = members.find((m) => m.userId === person);
  const nameOf = (a: Assignee) => a.name || members.find((m) => m.userId === a.user_id)?.name || "Pessoa removida";

  const openNew = (ids: string[] = []) => {
    setPreselect(ids);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <Button size="lg" className="w-full sm:w-auto" onClick={() => openNew()} disabled={membersQ.isLoading}>
        <Plus className="size-5" /> Nova atividade
      </Button>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <section className="surface p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-lg font-semibold">Atividades criadas</h2>
            <Select value={person} onValueChange={setPerson}>
              <SelectTrigger className="w-full sm:w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as pessoas</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m.userId} value={m.userId}>
                    {m.name}
                    {m.isMe ? " (você)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedMember && (
            <Button variant="outline" size="sm" className="mt-3" onClick={() => openNew([selectedMember.userId])}>
              <UserPlus className="size-4" /> Atribuir a {selectedMember.name}
            </Button>
          )}

          {tasksQ.isError ? (
            <QueryError message="Não foi possível carregar as atividades" error={tasksQ.error} onRetry={() => tasksQ.refetch()} retrying={tasksQ.isFetching} />
          ) : tasksQ.isLoading ? (
            <Loader2 className="mt-4 size-4 animate-spin text-muted-foreground" />
          ) : tasks.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">Nenhuma atividade por aqui ainda.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {tasks.map((t) => {
                const as = t.assignees ?? [];
                const doneCount = as.filter((a) => a.done_now).length;
                const overdue = doneCount < as.length && isPastDue(t.due_date);
                return (
                  <li key={t.id} className="rounded-xl border border-border p-4">
                    <div className="flex gap-3">
                      {t.photo_url && <PhotoThumb url={t.photo_url} title={t.title} />}
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium">{t.title}</p>
                            <Badge variant="secondary">{FREQ_LABEL[t.frequency]}</Badge>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="shrink-0 text-muted-foreground hover:text-destructive"
                            aria-label={`Apagar ${t.title}`}
                            onClick={() => setToDelete(t)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                        <TaskBody task={t} overdue={overdue} />
                      </div>
                    </div>
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center gap-3">
                        <Progress value={as.length ? (doneCount / as.length) * 100 : 0} className="h-2 flex-1" />
                        <span className="num shrink-0 text-xs text-muted-foreground">
                          {doneCount} de {as.length} concluíram
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {as.map((a) => (
                          <span
                            key={a.user_id}
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                              a.done_now ? "bg-success/10 text-success" : "bg-secondary text-muted-foreground"
                            }`}
                          >
                            {a.done_now ? <CheckCircle2 className="size-3" /> : <Circle className="size-3" />}
                            {nameOf(a)}
                          </span>
                        ))}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="surface p-5">
          <h2 className="font-display text-lg font-semibold">Equipe</h2>
          <p className="text-xs text-muted-foreground">Clique em uma pessoa para ver as atividades dela.</p>
          {membersQ.isError ? (
            <QueryError error={membersQ.error} onRetry={() => membersQ.refetch()} retrying={membersQ.isFetching} />
          ) : membersQ.isLoading ? (
            <Loader2 className="mt-4 size-4 animate-spin text-muted-foreground" />
          ) : (
            <>
              <ul className="mt-3 divide-y divide-border">
                {members.map((m) => {
                  const digits = m.phone?.replace(/\D/g, "") ?? "";
                  const wa = digits ? (digits.startsWith("55") ? digits : `55${digits}`) : null;
                  const active = person === m.userId;
                  return (
                    <li key={m.userId} className="flex items-center gap-2 py-2.5">
                      <button
                        type="button"
                        className={`min-w-0 flex-1 rounded-lg px-2 py-1 text-left ${active ? "bg-primary/10" : "hover:bg-secondary/60"}`}
                        onClick={() => setPerson(active ? "all" : m.userId)}
                      >
                        <span className="block truncate text-sm font-medium">
                          {m.name} {m.isMe && <span className="text-muted-foreground">(você)</span>}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {[m.subtitle, m.email].filter(Boolean).join(" · ")}
                        </span>
                      </button>
                      {wa && (
                        <Button asChild variant="ghost" size="icon" className="text-success">
                          <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" aria-label={`WhatsApp de ${m.name}`}>
                            <MessageCircle className="size-4" />
                          </a>
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
              {members.filter((m) => !m.isMe).length === 0 && (
                <p className="mt-3 rounded-lg bg-secondary/60 p-3 text-xs text-muted-foreground">
                  Ainda não há funcionários na empresa. Convide pessoas em Equipe — elas só aparecem aqui depois de
                  criarem a conta pelo convite.
                </p>
              )}
            </>
          )}
        </section>
      </div>

      <NewTaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        companyId={companyId}
        members={members}
        initialSelected={preselect}
      />

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar atividade?</AlertDialogTitle>
            <AlertDialogDescription>
              "{toDelete?.title}" será removida para todas as pessoas, junto com o histórico de conclusões.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                if (toDelete) del.mutate(toDelete.id);
              }}
              disabled={del.isPending}
            >
              {del.isPending && <Loader2 className="size-4 animate-spin" />} Apagar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
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
            <ManageTeam companyId={session.companyId} myId={session.userId} />
          </TabsContent>
        </Tabs>
      ) : (
        <MyTasks />
      )}
    </div>
  );
}
