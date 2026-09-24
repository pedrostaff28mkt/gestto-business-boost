import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Package, Plus, AlertTriangle, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useGestto } from "@/hooks/use-gestto";
import { useActiveBranch, BRANCH_REQUIRED_MSG } from "@/hooks/use-active-branch";
import { usePaywall } from "@/components/paywall";
import { brl, num } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/estoque")({
  head: () => ({
    meta: [
      { title: "Estoque — Gestto" },
      { name: "description", content: "Produtos/serviços com custo, preço, margem, mínimo e alerta de validade." },
      { property: "og:title", content: "Estoque — Gestto" },
      { property: "og:description", content: "Controle produtos/serviços, margem e alertas de estoque mínimo." },
    ],
  }),
  component: InventoryPage,
});

const emptyForm = {
  name: "",
  sku: "",
  cost_price: "",
  sale_price: "",
  stock_qty: "",
  min_stock: "",
  expires_at: "",
};

function InventoryPage() {
  const { session, can } = useGestto();
  const { writeBranchId } = useActiveBranch();
  const { guard } = usePaywall();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const companyId = session?.companyId;

  const { data: products } = useQuery({
    queryKey: ["products", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, sku, cost_price, sale_price, stock_qty, min_stock, expires_at, active")
        .eq("company_id", companyId!)
        .order("name");
      return data ?? [];
    },
  });

  const createProduct = useMutation({
    mutationFn: async () => {
      if (!writeBranchId) throw new Error(BRANCH_REQUIRED_MSG);
      const { error } = await supabase.from("products").insert({
        company_id: companyId!,
        branch_id: writeBranchId,
        name: form.name.trim(),
        sku: form.sku.trim() || null,
        cost_price: Number(form.cost_price.replace(",", ".")) || 0,
        sale_price: Number(form.sale_price.replace(",", ".")) || 0,
        stock_qty: Number(form.stock_qty.replace(",", ".")) || 0,
        min_stock: Number(form.min_stock.replace(",", ".")) || 0,
        expires_at: form.expires_at || null,
      });
      if (error) throw error;
      await supabase.from("audit_logs").insert({
        company_id: companyId!,
        user_id: session!.userId,
        action: "product.create",
        entity: "products",
        details: { name: form.name },
      });
    },
    onSuccess: () => {
      toast.success("Produto/serviço cadastrado");
      setForm(emptyForm);
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["products", companyId] });
    },
    onError: (e: Error) => toast.error("Erro ao cadastrar", { description: e.message }),
  });

  const cost = Number(form.cost_price.replace(",", ".")) || 0;
  const price = Number(form.sale_price.replace(",", ".")) || 0;
  const margin = cost > 0 ? ((price - cost) / cost) * 100 : 0;
  const suggested = cost > 0 ? cost * 1.4 : 0;

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  if (!can("inventory")) {
    return <p className="text-sm text-muted-foreground">Você não tem acesso ao módulo de estoque.</p>;
  }

  const canWrite = can("inventory", "create");

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Estoque</h1>
          <p className="text-sm text-muted-foreground">{products?.length ?? 0} produto(s)/serviço(s) cadastrado(s)</p>
        </div>
        {canWrite && (
          <Dialog open={open} onOpenChange={(v) => guard(() => setOpen(v))}>
            <DialogTrigger asChild>
              <Button className="gap-2" onClick={(e) => { e.preventDefault(); guard(() => setOpen(true)); }}>
                <Plus className="size-4" /> Novo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl">
              <DialogHeader>
                <DialogTitle>Novo produto/serviço</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Nome</Label>
                  <Input id="name" value={form.name} onChange={set("name")} placeholder="Ex: Corte de cabelo, Bolo de chocolate, Consultoria..." />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="cost">Custo (R$)</Label>
                    <Input id="cost" inputMode="decimal" className="num" value={form.cost_price} onChange={set("cost_price")} placeholder="0,00" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="price">Preço (R$)</Label>
                    <Input id="price" inputMode="decimal" className="num" value={form.sale_price} onChange={set("sale_price")} placeholder="0,00" />
                  </div>
                </div>
                {cost > 0 && (
                  <div className="flex items-center justify-between rounded-lg bg-primary-soft px-3 py-2 text-sm">
                    <span className="flex items-center gap-1.5 text-primary">
                      <Sparkles className="size-3.5" /> Preço sugerido (40% sobre o custo)
                    </span>
                    <button
                      className="num font-semibold text-primary"
                      onClick={() => setForm((f) => ({ ...f, sale_price: suggested.toFixed(2) }))}
                    >
                      {brl(suggested)}
                    </button>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="qty">Quantidade</Label>
                    <Input id="qty" inputMode="decimal" className="num" value={form.stock_qty} onChange={set("stock_qty")} placeholder="0" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="min">Estoque mínimo</Label>
                    <Input id="min" inputMode="decimal" className="num" value={form.min_stock} onChange={set("min_stock")} placeholder="0" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="sku">Código / SKU</Label>
                    <Input id="sku" value={form.sku} onChange={set("sku")} placeholder="opcional" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="exp">Validade</Label>
                    <Input id="exp" type="date" value={form.expires_at} onChange={set("expires_at")} />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Margem atual: <span className="num font-medium text-foreground">{num(margin, 1)}%</span>
                </p>
                <Button
                  className="w-full"
                  disabled={createProduct.isPending || !form.name.trim()}
                  onClick={() => guard(() => createProduct.mutate())}
                >
                  {createProduct.isPending && <Loader2 className="size-4 animate-spin" />} Salvar produto
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {!products?.length ? (
        <div className="surface flex flex-col items-center gap-2 p-10 text-center">
          <Package className="size-8 text-muted-foreground" />
          <p className="font-medium">Nenhum produto/serviço ainda</p>
          <p className="text-sm text-muted-foreground">
            Cadastre seus produtos/serviços para controlar custo, margem e estoque mínimo.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {products.map((p) => {
            const low = Number(p.stock_qty) <= Number(p.min_stock) && Number(p.min_stock) > 0;
            const marginP =
              Number(p.cost_price) > 0
                ? ((Number(p.sale_price) - Number(p.cost_price)) / Number(p.cost_price)) * 100
                : 0;
            return (
              <div key={p.id} className="surface flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="truncate font-medium">{p.name}</p>
                  <p className="num text-xs text-muted-foreground">
                    custo {brl(Number(p.cost_price))} · margem {num(marginP, 0)}%
                    {p.expires_at ? ` · val. ${new Date(p.expires_at).toLocaleDateString("pt-BR")}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {low && (
                    <Badge variant="outline" className="gap-1 border-warning text-warning-foreground">
                      <AlertTriangle className="size-3" /> baixo
                    </Badge>
                  )}
                  <div className="text-right">
                    <p className="num font-semibold">{brl(Number(p.sale_price))}</p>
                    <p className="num text-xs text-muted-foreground">{num(Number(p.stock_qty), 0)} un</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
