import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import QRCode from "qrcode";
import {
  QrCode,
  CreditCard,
  Copy,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Calculator,
  Receipt,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useGestto } from "@/hooks/use-gestto";
import { usePaywall } from "@/components/paywall";
import { buildPixPayload, cardFees } from "@/lib/pix";
import { brl, dateTime, num } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MethodIcon } from "@/components/payment-method-badge";

export const Route = createFileRoute("/_authenticated/vendas")({
  head: () => ({
    meta: [
      { title: "Vendas — Gestto" },
      { name: "description", content: "Gere QR Code PIX, lance vendas no cartão e acompanhe sua comissão." },
      { property: "og:title", content: "Vendas — Gestto" },
      { property: "og:description", content: "PIX, cartão com parcelas e histórico de vendas do dia." },
    ],
  }),
  component: SalesPage,
});

/** Campo de valor com prefixo "R$" fixo e destaque ao digitar. */
function AmountField({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>Valor da venda</Label>
      <div
        className={`flex items-center gap-2 rounded-xl border bg-card px-4 py-2 transition-all duration-200 ${
          focused
            ? "border-primary shadow-[0_0_0_4px_var(--primary-soft)] scale-[1.01]"
            : "border-input"
        }`}
      >
        <span className="num text-xl font-semibold text-muted-foreground select-none">R$</span>
        <Input
          id={id}
          inputMode="decimal"
          placeholder="0,00"
          className="num h-auto border-0 bg-transparent p-0 text-3xl font-bold tracking-tight shadow-none focus-visible:ring-0"
          value={value}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  );
}

function SalesPage() {
  const { session, can } = useGestto();
  const { guard, locked } = usePaywall();
  const queryClient = useQueryClient();

  const [pixAmount, setPixAmount] = useState("");
  const [pixData, setPixData] = useState<{ payload: string; image: string; amount: number } | null>(null);
  const [pixConfirmed, setPixConfirmed] = useState(false);
  const [cardAmount, setCardAmount] = useState("");
  const [cardType, setCardType] = useState<"card_credit" | "card_debit">("card_credit");
  const [installments, setInstallments] = useState("1");

  const companyId = session?.companyId;
  const hasPaymentSetup = !!session?.payment.pixKey;

  const { data: sales } = useQuery({
    queryKey: ["sales", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data } = await supabase
        .from("sales")
        .select("id, created_at, method, installments, gross_amount, fee_amount, net_amount, status")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });

  const registerSale = useMutation({
    mutationFn: async (payload: {
      method: "pix" | "card_credit" | "card_debit";
      gross: number;
      fee: number;
      installments: number;
      pixPayload?: string;
    }) => {
      const { error } = await supabase.from("sales").insert({
        company_id: companyId!,
        branch_id: session!.branchId,
        seller_id: session!.userId,
        method: payload.method,
        installments: payload.installments,
        gross_amount: payload.gross,
        fee_amount: payload.fee,
        net_amount: payload.gross - payload.fee,
        pix_payload: payload.pixPayload ?? null,
        status: "paid",
      });
      if (error) throw error;
      await supabase.from("audit_logs").insert({
        company_id: companyId!,
        user_id: session!.userId,
        action: "sale.create",
        entity: "sales",
        details: { method: payload.method, gross: payload.gross },
      });
    },
    onSuccess: () => {
      toast.success("Venda registrada");
      queryClient.invalidateQueries({ queryKey: ["sales", companyId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", companyId] });
    },
    onError: (e: Error) => toast.error("Erro ao registrar venda", { description: e.message }),
  });

  async function generatePix() {
    const amount = Number(pixAmount.replace(",", "."));
    if (!amount || amount <= 0) return toast.error("Informe um valor válido");
    if (!session?.payment.pixKey) return toast.error("Cadastre sua chave PIX em Ajustes");

    const payload = buildPixPayload({
      pixKey: session.payment.pixKey,
      amount,
      merchantName: session.payment.merchantName ?? session.companyName,
      merchantCity: session.payment.merchantCity ?? "SAO PAULO",
      txid: `GESTTO${Date.now().toString().slice(-8)}`,
    });
    const image = await QRCode.toDataURL(payload, { width: 512, margin: 1 });
    setPixConfirmed(false);
    setPixData({ payload, image, amount });
  }

  const cardValue = Number(cardAmount.replace(",", ".")) || 0;
  const fees = cardFees({
    amount: cardValue,
    installments: Number(installments),
    debitFee: session?.payment.debitFee ?? 0,
    creditFee: session?.payment.creditFee ?? 0,
    installmentFee: session?.payment.installmentFee ?? 0,
    isDebit: cardType === "card_debit",
  });

  if (!can("sales")) {
    return <p className="text-sm text-muted-foreground">Você não tem acesso ao módulo de vendas.</p>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Vendas</h1>
        <p className="text-sm text-muted-foreground">Receba no PIX ou lance no cartão em segundos.</p>
      </div>

      {!hasPaymentSetup && (
        <div className="surface border-warning/40 bg-warning-soft/40 p-5">
          <div className="flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-warning-soft text-warning-foreground">
              <AlertTriangle className="size-5" />
            </span>
            <div className="text-sm">
              <p className="font-display text-base font-semibold">
                Cadastre a chave PIX e as taxas da maquininha
              </p>
              <p className="text-muted-foreground">
                É pré-requisito para liberar o recebimento e o cálculo de lucro líquido.
              </p>
              <Button asChild size="sm" variant="outline" className="mt-3">
                <Link to="/configuracoes">Ir para Ajustes</Link>
              </Button>
            </div>
          </div>
        </div>
      )}

      <Tabs defaultValue="pix">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-xl bg-secondary p-1">
          <TabsTrigger
            value="pix"
            className="gap-2 rounded-lg py-2.5 text-sm font-semibold data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm"
          >
            <QrCode className="size-4" /> PIX
          </TabsTrigger>
          <TabsTrigger
            value="card"
            className="gap-2 rounded-lg py-2.5 text-sm font-semibold data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm"
          >
            <CreditCard className="size-4" /> Cartão
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pix">
          <div className="surface mt-3 space-y-4 p-5">
            <AmountField id="pixAmount" value={pixAmount} onChange={setPixAmount} />
            <Button
              size="lg"
              className="w-full gap-2"
              onClick={() => guard(generatePix)}
              disabled={!hasPaymentSetup && !locked}
            >
              <QrCode className="size-4" /> Gerar QR Code PIX
            </Button>

            {pixData && (
              <div className="rounded-3xl border border-border bg-card p-6 text-center shadow-lg">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                    pixConfirmed
                      ? "bg-success-soft text-success"
                      : "bg-warning-soft text-warning-foreground"
                  }`}
                >
                  {pixConfirmed ? (
                    <>
                      <CheckCircle2 className="size-3.5" /> Confirmado
                    </>
                  ) : (
                    <>
                      <Clock className="size-3.5 animate-pulse" /> Aguardando pagamento
                    </>
                  )}
                </span>
                <div className="mx-auto mt-4 w-fit rounded-2xl border border-border bg-background p-3 shadow-sm">
                  <img src={pixData.image} alt="QR Code PIX da venda" className="size-52 rounded-xl" />
                </div>
                <p className="num mt-4 bg-gradient-to-r from-primary to-chart-4 bg-clip-text text-3xl font-bold tracking-tight text-transparent">
                  {brl(pixData.amount)}
                </p>
                <div className="mt-4 flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 gap-2"
                    onClick={() => {
                      navigator.clipboard.writeText(pixData.payload);
                      toast.success("Código copia e cola copiado");
                    }}
                  >
                    <Copy className="size-4" /> Copiar código
                  </Button>
                  <Button
                    className="flex-1 gap-2"
                    disabled={registerSale.isPending}
                    onClick={() =>
                      guard(() =>
                        registerSale.mutate(
                          {
                            method: "pix",
                            gross: pixData.amount,
                            fee: 0,
                            installments: 1,
                            pixPayload: pixData.payload,
                          },
                          { onSuccess: () => setPixConfirmed(true) },
                        ),
                      )
                    }
                  >
                    {registerSale.isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="size-4" />
                    )}
                    Confirmar recebimento
                  </Button>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="card">
          <div className="surface mt-3 space-y-4 p-5">
            <AmountField id="cardAmount" value={cardAmount} onChange={setCardAmount} />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={cardType} onValueChange={(v) => setCardType(v as typeof cardType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="card_credit">Crédito</SelectItem>
                    <SelectItem value="card_debit">Débito</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Parcelas</Label>
                <Select
                  value={installments}
                  onValueChange={setInstallments}
                  disabled={cardType === "card_debit"}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}x
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-secondary/60 p-4 text-sm shadow-sm">
              <div className="flex items-center gap-2">
                <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Calculator className="size-4" />
                </span>
                <p className="font-display text-sm font-semibold">Resumo das taxas</p>
              </div>
              <div className="mt-3 flex justify-between">
                <span className="text-muted-foreground">Taxa aplicada</span>
                <span className="num">{num(fees.rate, 2)}%</span>
              </div>
              <div className="mt-1 flex justify-between">
                <span className="text-muted-foreground">Desconto da maquininha</span>
                <span className="num text-warning-foreground">- {brl(fees.fee)}</span>
              </div>
              <div className="mt-3 flex items-center justify-between rounded-xl bg-success-soft px-3 py-2.5">
                <span className="font-semibold">Você recebe</span>
                <span className="num text-xl font-bold text-success">{brl(fees.net)}</span>
              </div>
              {Number(installments) > 1 && cardType === "card_credit" && (
                <p className="num mt-2 text-xs text-muted-foreground">
                  {installments}x de {brl(cardValue / Number(installments))}
                </p>
              )}
            </div>

            <Button
              size="lg"
              className="w-full gap-2"
              disabled={registerSale.isPending}
              onClick={() =>
                guard(() => {
                  if (cardValue <= 0) return toast.error("Informe um valor válido");
                  registerSale.mutate({
                    method: cardType,
                    gross: cardValue,
                    fee: fees.fee,
                    installments: cardType === "card_debit" ? 1 : Number(installments),
                  });
                  setCardAmount("");
                })
              }
            >
              <CreditCard className="size-4" /> Lançar venda no cartão
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      <div className="surface p-5">
        <h2 className="font-display text-lg font-semibold">Histórico</h2>
        {!sales?.length ? (
          <div className="mt-4 flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-10 text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-secondary text-muted-foreground">
              <Receipt className="size-7" />
            </span>
            <p className="text-sm font-medium">Nenhuma venda registrada</p>
            <p className="max-w-xs text-xs text-muted-foreground">
              Gere um QR Code PIX ou lance uma venda no cartão para começar seu histórico.
            </p>
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {sales.map((s) => (
              <li key={s.id} className="flex items-center gap-3 py-2.5">
                <MethodIcon method={s.method} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {s.method === "pix"
                      ? "PIX"
                      : s.method === "card_debit"
                        ? "Débito"
                        : s.method === "cash"
                          ? "Dinheiro"
                          : `Crédito ${s.installments}x`}
                  </p>
                  <p className="text-xs text-muted-foreground">{dateTime(s.created_at)}</p>
                </div>
                <div className="text-right">
                  <p className="num text-sm font-semibold">{brl(Number(s.gross_amount))}</p>
                  <p className="num text-xs text-muted-foreground">líq. {brl(Number(s.net_amount))}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
