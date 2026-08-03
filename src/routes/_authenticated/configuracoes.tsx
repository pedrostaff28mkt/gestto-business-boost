import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Loader2, KeyRound, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useGestto, roleLabels } from "@/hooks/use-gestto";
import { usePaywall, LockedArea } from "@/components/paywall";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({
    meta: [
      { title: "Ajustes — Gestto" },
      { name: "description", content: "Cadastre a chave PIX e as taxas da maquininha do seu negócio." },
      { property: "og:title", content: "Ajustes — Gestto" },
      { property: "og:description", content: "Chave PIX, taxas de cartão e dados da empresa." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { session, isPaywalled, trialDaysLeft } = useGestto();
  const { guard } = usePaywall();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    pix_key: "",
    merchant_name: "",
    merchant_city: "",
    card_provider: "",
    debit_fee_percent: "",
    credit_fee_percent: "",
    installment_fee_percent: "",
    terminal_monthly_fee: "",
  });

  useEffect(() => {
    if (!session) return;
    setForm({
      pix_key: session.payment.pixKey ?? "",
      merchant_name: session.payment.merchantName ?? "",
      merchant_city: session.payment.merchantCity ?? "",
      card_provider: session.payment.cardProvider ?? "",
      debit_fee_percent: String(session.payment.debitFee),
      credit_fee_percent: String(session.payment.creditFee),
      installment_fee_percent: String(session.payment.installmentFee),
      terminal_monthly_fee: String(session.payment.terminalMonthlyFee),
    });
  }, [session]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("payment_settings")
        .update({
          pix_key: form.pix_key.trim() || null,
          merchant_name: form.merchant_name.trim() || null,
          merchant_city: form.merchant_city.trim() || null,
          card_provider: form.card_provider.trim() || null,
          debit_fee_percent: Number(form.debit_fee_percent.replace(",", ".")) || 0,
          credit_fee_percent: Number(form.credit_fee_percent.replace(",", ".")) || 0,
          installment_fee_percent: Number(form.installment_fee_percent.replace(",", ".")) || 0,
          terminal_monthly_fee: Number(form.terminal_monthly_fee.replace(",", ".")) || 0,
        })
        .eq("company_id", session!.companyId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Configurações salvas");
      queryClient.invalidateQueries({ queryKey: ["gestto-session"] });
    },
    onError: (e: Error) => toast.error("Erro ao salvar", { description: e.message }),
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Ajustes</h1>
        <p className="text-sm text-muted-foreground">Recebimento, taxas e assinatura.</p>
      </div>

      <div className="surface p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Assinatura</p>
            <p className="font-display text-lg font-semibold">
              {isPaywalled ? (trialDaysLeft > 0 ? "Teste grátis" : "Bloqueada") : "Ativa"}
            </p>
          </div>
          <Badge variant={isPaywalled ? "outline" : "default"}>
            {isPaywalled ? `${trialDaysLeft} dia(s)` : "R$ 99,99/mês"}
          </Badge>
        </div>
      </div>

      <LockedArea className="space-y-4">
      <div className="surface space-y-4 p-5">

        <div className="flex items-center gap-2">
          <KeyRound className="size-4 text-primary" />
          <h2 className="font-display text-lg font-semibold">Chave PIX</h2>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pix">Chave PIX (CPF/CNPJ, e-mail, telefone ou aleatória)</Label>
          <Input id="pix" value={form.pix_key} onChange={set("pix_key")} placeholder="00000000000" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="mn">Nome do recebedor</Label>
            <Input id="mn" value={form.merchant_name} onChange={set("merchant_name")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mc">Cidade</Label>
            <Input id="mc" value={form.merchant_city} onChange={set("merchant_city")} />
          </div>
        </div>
      </div>

      <div className="surface space-y-4 p-5">
        <div className="flex items-center gap-2">
          <CreditCard className="size-4 text-primary" />
          <h2 className="font-display text-lg font-semibold">Maquininha de cartão</h2>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cp">Operadora</Label>
          <Input id="cp" value={form.card_provider} onChange={set("card_provider")} placeholder="Ex.: PagBank, Stone, Mercado Pago" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="df">Taxa débito (%)</Label>
            <Input id="df" inputMode="decimal" className="num" value={form.debit_fee_percent} onChange={set("debit_fee_percent")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cf">Taxa crédito à vista (%)</Label>
            <Input id="cf" inputMode="decimal" className="num" value={form.credit_fee_percent} onChange={set("credit_fee_percent")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="if">Acréscimo por parcela (%)</Label>
            <Input id="if" inputMode="decimal" className="num" value={form.installment_fee_percent} onChange={set("installment_fee_percent")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tm">Mensalidade da maquininha (R$)</Label>
            <Input id="tm" inputMode="decimal" className="num" value={form.terminal_monthly_fee} onChange={set("terminal_monthly_fee")} />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Esses valores são descontados automaticamente do lucro líquido no dashboard.
        </p>
      </div>

      <Button
        size="lg"
        className="w-full"
        disabled={save.isPending}
        onClick={() => guard(() => save.mutate())}
      >
        {save.isPending && <Loader2 className="size-4 animate-spin" />} Salvar configurações
      </Button>

      <div className="surface p-5">
        <h2 className="font-display text-lg font-semibold">Seu acesso</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {session?.fullName} · {session ? roleLabels[session.role] : ""} · {session?.companyName}
        </p>
      </div>
    </div>
  );
}
