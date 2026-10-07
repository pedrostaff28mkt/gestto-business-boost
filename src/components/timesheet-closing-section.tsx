import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useGestto } from "@/hooks/use-gestto";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function TimesheetClosingSection() {
  const { session } = useGestto();
  const queryClient = useQueryClient();
  const companyId = session?.companyId;
  const [day, setDay] = useState("");
  const [saving, setSaving] = useState(false);

  const { data } = useQuery({
    queryKey: ["timesheet-closing-day", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("timesheet_closing_day")
        .eq("id", companyId!)
        .single();
      if (error) throw error;
      return data.timesheet_closing_day as number | null;
    },
  });

  useEffect(() => {
    setDay(data ? String(data) : "");
  }, [data]);

  async function save() {
    const n = day.trim() === "" ? null : Number(day);
    if (n !== null && (!Number.isInteger(n) || n < 1 || n > 28)) {
      toast.error("Informe um dia entre 1 e 28");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("companies").update({ timesheet_closing_day: n }).eq("id", companyId!);
    setSaving(false);
    if (error) {
      toast.error("Não foi possível salvar", { description: error.message });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["timesheet-closing-day", companyId] });
    toast.success("Dia de fechamento salvo");
  }

  return (
    <div className="surface space-y-4 p-5">
      <div className="flex items-center gap-2">
        <CalendarClock className="size-4 text-primary" />
        <h2 className="font-display text-lg font-semibold">Ponto</h2>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="closingDay">Dia de fechamento do ponto</Label>
        <Input
          id="closingDay"
          type="number"
          min={1}
          max={28}
          inputMode="numeric"
          value={day}
          onChange={(e) => setDay(e.target.value)}
          placeholder="Ex: 25"
          className="max-w-[140px]"
        />
        <p className="text-xs text-muted-foreground">
          Dia do mês em que o ciclo de ponto se fecha, para referência do relatório mensal.
        </p>
      </div>
      <Button onClick={save} disabled={saving}>
        {saving && <Loader2 className="size-4 animate-spin" />} Salvar
      </Button>
    </div>
  );
}
