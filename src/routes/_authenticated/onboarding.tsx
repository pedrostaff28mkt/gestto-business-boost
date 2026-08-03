import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Users, Wallet, Store } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useGestto } from "@/hooks/use-gestto";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  EMPLOYEE_RANGES,
  REVENUE_RANGES,
  SEGMENTS,
  classifyCompanySize,
  type EmployeeRange,
  type RevenueRange,
} from "@/lib/company-profile";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Conte sobre seu negócio — Gestto" },
      { name: "description", content: "Três perguntas rápidas para personalizar o Gestto para a sua empresa." },
      { property: "og:title", content: "Conte sobre seu negócio — Gestto" },
      { property: "og:description", content: "Personalize o Gestto respondendo três perguntas rápidas." },
    ],
  }),
  component: OnboardingPage,
});

function OptionGroup<T extends string>({
  options,
  value,
  onSelect,
}: {
  options: readonly { value: T; label: string }[];
  value: T | "";
  onSelect: (v: T) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onSelect(o.value)}
          className={`rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${
            value === o.value
              ? "border-primary bg-primary-soft text-foreground"
              : "border-border hover:bg-secondary"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function OnboardingPage() {
  const { session, isLoading } = useGestto();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [employees, setEmployees] = useState<EmployeeRange | "">("");
  const [revenue, setRevenue] = useState<RevenueRange | "">("");
  const [segment, setSegment] = useState<string>("");

  // Quem entra por convite (não é dono) ou já respondeu vai direto ao painel.
  useEffect(() => {
    if (isLoading || !session) return;
    if (session.role !== "owner" || session.quizCompletedAt) {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [isLoading, session, navigate]);

  const save = useMutation({
    mutationFn: async () => {
      if (!employees || !revenue || !segment.trim()) throw new Error("Responda as três perguntas.");
      const { error } = await supabase
        .from("companies")
        .update({
          quiz_employees: employees,
          quiz_revenue: revenue,
          quiz_segment: segment.trim(),
          company_size: classifyCompanySize(employees, revenue),
          quiz_completed_at: new Date().toISOString(),
        })
        .eq("id", session!.companyId);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["gestto-session"] });
      toast.success("Prontinho! Gestto ajustado para o seu negócio.");
      navigate({ to: "/dashboard", replace: true });
    },
    onError: (e: Error) => toast.error("Não foi possível salvar", { description: e.message }),
  });

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Conte um pouco sobre o seu negócio</h1>
        <p className="text-sm text-muted-foreground">
          Três perguntas rápidas para deixar o Gestto com a sua cara. Leva menos de um minuto.
        </p>
      </div>

      <div className="surface space-y-3 p-5">
        <div className="flex items-center gap-2">
          <Users className="size-4 text-primary" />
          <Label>Quantas pessoas trabalham na empresa?</Label>
        </div>
        <OptionGroup options={EMPLOYEE_RANGES} value={employees} onSelect={setEmployees} />
      </div>

      <div className="surface space-y-3 p-5">
        <div className="flex items-center gap-2">
          <Wallet className="size-4 text-primary" />
          <Label>Faturamento mensal aproximado</Label>
        </div>
        <OptionGroup options={REVENUE_RANGES} value={revenue} onSelect={setRevenue} />
      </div>

      <div className="surface space-y-3 p-5">
        <div className="flex items-center gap-2">
          <Store className="size-4 text-primary" />
          <Label>Segmento do negócio</Label>
        </div>
        <OptionGroup options={SEGMENTS} value={segment} onSelect={setSegment} />
      </div>

      <Button size="lg" className="w-full" disabled={save.isPending} onClick={() => save.mutate()}>
        {save.isPending && <Loader2 className="size-4 animate-spin" />} Continuar para o painel
      </Button>
    </div>
  );
}
