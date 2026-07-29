import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import QRCode from "qrcode";
import { QrCode, CreditCard, Copy, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
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

function SalesPage() {
  const { session, can } = useGestto();
  const { guard, locked } = usePaywall();
  const queryClient = useQueryClient();

  const [pixAmount, setPixAmount] = useState("");
  const [pixData, setPixData] = useState<{ payload: string; image: string; amount: number } | null>(null);
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
        <h1 className="text-2xl font-bold">Vendas</h1>
        <p className="text-sm text-muted-foreground">Receba no PIX ou lance no cartão em segundos.</p>
      </div>

      {!hasPaymentSetup && (
        <div className="surface flex items-start gap-3 border-warning/40 p-4">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning-foreground" />
          <div className="text-sm">
            <p className="font-medium">Cadastre a chave PIX e as taxas da maquininha</p>
            <p className="text-muted-foreground">
              É pré-requisito para liberar o recebimento e o cálculo de lucro líquido.
            </p>
            <Link to="/configuracoes" className="mt-1 inline-block font-medium text-primary">
              Ir para Ajustes →
            </Link>
          </div>
        </div>
      )}

      <Tabs defaultValue="pix">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pix" className="gap-2">
            <QrCode className="size-4" /> PIX
          </TabsTrigger>
          <TabsTrigger value="card" className="gap-2">
            <CreditCard className="size-4" /> Cartão
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pix">
          <div className="surface mt-3 space-y-4 p-5">
            <div className="space-y-1.5">
              <Label htmlFor="pixAmount">Valor da venda</Label>
              <Input
                id="pixAmount"
                inputMode="decimal"
                placeholder="0,00"
                className="num text-2xl"
                value={pixAmount}
                onChange={(e) => setPixAmount(e.target.value)}
              />
            </div>
            <Button
              size="lg"
              className="w-full gap-2"
              onClick={() => guard(generatePix)}
              disabled={!hasPaymentSetup && !locked}
            >
              <QrCode className="size-4" /> Gerar QR Code PIX
            </Button>

            {pixData && (
              <div className="rounded-xl border border-border p-4 text-center">
                <img src={pixData.image} alt="QR Code PIX da venda" className="mx-auto size-52 rounded-lg" />
                <p className="num mt-3 text-2xl font-semibold">{brl(pixData.amount)}</p>
                <div className="mt-3 flex gap-2">
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
                        registerSale.mutate({
                          method: "pix",
                          gross: pixData.amount,
                          fee: 0,
                          installments: 1,
                          pixPayload: pixData.payload,
                        }),
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
            <div className="space-y-1.5">
              <Label htmlFor="cardAmount">Valor da venda</Label>
              <Input
                id="cardAmount"
                inputMode="decimal"
                placeholder="0,00"
                className="num text-2xl"
                value={cardAmount}
                onChange={(e) => setCardAmount(e.target.value)}
              />
            </div>
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

            <div className="rounded-xl bg-secondary p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Taxa aplicada</span>
                <span className="num">{num(fees.rate, 2)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Desconto da maquininha</span>
                <span className="num text-warning-foreground">- {brl(fees.fee)}</span>
              </div>
              <div className="mt-1 flex justify-between border-t border-border pt-2 font-medium">
                <span>Você recebe</span>
                <span className="num">{brl(fees.net)}</span>
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
          <p className="mt-3 text-sm text-muted-foreground">Nenhuma venda registrada.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {sales.map((s) => (
              <li key={s.id} className="flex items-center justify-between py-2.5">
                <div>
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
                  <p className="num text-sm font-medium">{brl(Number(s.gross_amount))}</p>
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
