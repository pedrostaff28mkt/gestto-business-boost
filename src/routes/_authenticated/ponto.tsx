import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, LogIn, LogOut, Loader2, Download, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useGestto } from "@/hooks/use-gestto";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/ponto")({
  head: () => ({
    meta: [
      { title: "Ponto — Gestto" },
      { name: "description", content: "Bata seu ponto e acompanhe os registros de entrada e saída da equipe." },
      { property: "og:title", content: "Ponto — Gestto" },
      { property: "og:description", content: "Controle de ponto eletrônico simples para sua equipe." },
    ],
  }),
  component: PontoPage,
});

type Entry = { id: string; user_id: string; type: "in" | "out"; clocked_at: string };

const fmtTime = (d: string | Date) =>
  new Date(d).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
const fmtDate = (d: string | Date) => new Date(d).toLocaleDateString("pt-BR");
const typeLabel = (t: "in" | "out") => (t === "in" ? "Entrada" : "Saída");

function TypeChip({ type }: { type: "in" | "out" }) {
  const Icon = type === "in" ? LogIn : LogOut;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
        type === "in" ? "bg-success/10 text-success" : "bg-secondary text-muted-foreground"
      }`}
    >
      <Icon className="size-3" /> {typeLabel(type)}
    </span>
  );
}

function MyTimesheet() {
  const { session } = useGestto();
  const queryClient = useQueryClient();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["my-time-entries", session?.companyId, session?.userId],
    enabled: !!session,
    queryFn: async () => {
      const since = new Date();
      since.setHours(0, 0, 0, 0);
      since.setDate(since.getDate() - 7);
      const { data, error } = await supabase
        .from("time_entries")
        .select("id, user_id, type, clocked_at")
        .eq("company_id", session!.companyId)
        .eq("user_id", session!.userId)
        .gte("clocked_at", since.toISOString())
        .order("clocked_at", { ascending: false });
      if (error) throw error;
      return data as Entry[];
    },
  });

  const todayKey = new Date().toDateString();
  const today = entries.filter((e) => new Date(e.clocked_at).toDateString() === todayKey);
  const history = entries.filter((e) => new Date(e.clocked_at).toDateString() !== todayKey);
  const nextType: "in" | "out" = today[0]?.type === "in" ? "out" : "in";

  const historyByDay = useMemo(() => {
    const map = new Map<string, Entry[]>();
    for (const e of history) {
      const k = fmtDate(e.clocked_at);
      map.set(k, [...(map.get(k) ?? []), e]);
    }
    return [...map.entries()];
  }, [history]);

  const clock = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("time_entries").insert({
        company_id: session!.companyId,
        branch_id: session!.branchId,
        user_id: session!.userId,
        type: nextType,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(nextType === "in" ? "Entrada registrada" : "Saída registrada");
      queryClient.invalidateQueries({ queryKey: ["my-time-entries"] });
      queryClient.invalidateQueries({ queryKey: ["team-time-entries"] });
    },
    onError: (e: Error) => toast.error("Não foi possível registrar o ponto", { description: e.message }),
  });

  return (
    <section className="surface p-5">
      <div className="flex items-center gap-2">
        <Clock className="size-4 text-primary" />
        <h2 className="font-display text-lg font-semibold">Meu ponto</h2>
      </div>

      <button
        type="button"
        disabled={clock.isPending || !session}
        onClick={() => clock.mutate()}
        className="mt-4 flex w-full flex-col items-center gap-1 rounded-2xl bg-primary px-6 py-6 text-primary-foreground shadow-sm transition-opacity hover:opacity-95 disabled:opacity-60"
      >
        <span className="num font-display text-4xl font-bold">
          {now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </span>
        <span className="flex items-center gap-2 text-sm font-medium">
          {clock.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : nextType === "in" ? (
            <LogIn className="size-4" />
          ) : (
            <LogOut className="size-4" />
          )}
          Bater ponto · {nextType === "in" ? "Registrar entrada" : "Registrar saída"}
        </span>
      </button>

      <div className="mt-5">
        <p className="text-sm font-medium">Hoje</p>
        {isLoading ? (
          <Loader2 className="mt-2 size-4 animate-spin text-muted-foreground" />
        ) : today.length === 0 ? (
          <p className="mt-1 text-sm text-muted-foreground">Nenhum registro hoje.</p>
        ) : (
          <ul className="mt-2 divide-y divide-border">
            {today.map((e) => (
              <li key={e.id} className="flex items-center justify-between py-2 text-sm">
                <span className="num">{fmtTime(e.clocked_at)}</span>
                <TypeChip type={e.type} />
              </li>
            ))}
          </ul>
        )}
      </div>

      {historyByDay.length > 0 && (
        <div className="mt-5">
          <p className="text-sm font-medium">Últimos 7 dias</p>
          <ul className="mt-2 space-y-2">
            {historyByDay.map(([day, list]) => (
              <li key={day} className="rounded-xl border border-border p-3 text-sm">
                <p className="num text-xs text-muted-foreground">{day}</p>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {[...list].reverse().map((e) => (
                    <span key={e.id} className="inline-flex items-center gap-1.5">
                      <span className="num">{fmtTime(e.clocked_at)}</span>
                      <TypeChip type={e.type} />
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function TeamTimesheet({ companyId }: { companyId: string }) {
  const nowD = new Date();
  const [month, setMonth] = useState(
    `${nowD.getFullYear()}-${String(nowD.getMonth() + 1).padStart(2, "0")}`,
  );
  const [person, setPerson] = useState("all");

  const { data: members = [] } = useQuery({
    queryKey: ["timesheet-members", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("memberships")
        .select("user_id, profiles:user_id(full_name)")
        .eq("company_id", companyId);
      if (error) throw error;
      return (data as unknown as { user_id: string; profiles: { full_name: string } | null }[]).map((m) => ({
        id: m.user_id,
        name: m.profiles?.full_name || "Sem nome",
      }));
    },
  });
  const nameOf = (id: string) => members.find((m) => m.id === id)?.name ?? "—";

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["team-time-entries", companyId, month, person],
    queryFn: async () => {
      const [y, m] = month.split("-").map(Number);
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 1);
      let q = supabase
        .from("time_entries")
        .select("id, user_id, type, clocked_at")
        .eq("company_id", companyId)
        .gte("clocked_at", start.toISOString())
        .lt("clocked_at", end.toISOString())
        .order("clocked_at", { ascending: false });
      if (person !== "all") q = q.eq("user_id", person);
      const { data, error } = await q;
      if (error) throw error;
      return data as Entry[];
    },
    enabled: /^\d{4}-\d{2}$/.test(month),
  });

  function exportCsv() {
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const lines = [
      ["Nome", "Data", "Hora", "Tipo"].join(","),
      ...entries.map((e) =>
        [nameOf(e.user_id), fmtDate(e.clocked_at), fmtTime(e.clocked_at), typeLabel(e.type)].map(esc).join(","),
      ),
    ];
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const [y, m] = month.split("-");
    const a = document.createElement("a");
    a.href = url;
    a.download = `ponto-${m}-${y}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Users className="size-4 text-primary" />
          <h2 className="font-display text-lg font-semibold">Ponto da equipe</h2>
        </div>
        <Button variant="outline" size="sm" onClick={exportCsv} disabled={entries.length === 0}>
          <Download className="size-4" /> Exportar CSV
        </Button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Funcionário</Label>
          <Select value={person} onValueChange={setPerson}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {members.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pontoMes">Mês</Label>
          <Input id="pontoMes" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        </div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Nome</th>
              <th className="px-3 py-2 text-left font-medium">Data</th>
              <th className="px-3 py-2 text-left font-medium">Hora</th>
              <th className="px-3 py-2 text-left font-medium">Tipo</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center">
                  <Loader2 className="mx-auto size-4 animate-spin text-muted-foreground" />
                </td>
              </tr>
            ) : entries.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">
                  Nenhum registro neste período.
                </td>
              </tr>
            ) : (
              entries.map((e) => (
                <tr key={e.id} className="border-t border-border">
                  <td className="px-3 py-2">{nameOf(e.user_id)}</td>
                  <td className="num px-3 py-2">{fmtDate(e.clocked_at)}</td>
                  <td className="num px-3 py-2">{fmtTime(e.clocked_at)}</td>
                  <td className="px-3 py-2">
                    <TypeChip type={e.type} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function PontoPage() {
  const { session, can } = useGestto();
  if (!session) return null;
  return (
    <div className="space-y-4">
      <header className="flex items-center gap-2">
        <Clock className="size-5 text-primary" />
        <h1 className="font-display text-2xl font-bold">Ponto</h1>
      </header>
      <MyTimesheet />
      {can("timesheet", "view") && <TeamTimesheet companyId={session.companyId} />}
    </div>
  );
}
