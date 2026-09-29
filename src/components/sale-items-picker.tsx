import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Package, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

export type SaleItem = { productId: string; name: string; price: number; quantity: number; stock: number | null };

export function saleItemsTotal(items: SaleItem[]) {
  return items.reduce((s, i) => s + i.price * (i.quantity || 0), 0);
}

export function SaleItemsPicker({
  companyId,
  branchId,
  items,
  onChange,
  disabled,
}: {
  companyId?: string;
  branchId: string | null;
  items: SaleItem[];
  onChange: (items: SaleItem[]) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const { data: products } = useQuery({
    queryKey: ["products", companyId, branchId],
    enabled: !!companyId,
    queryFn: async () => {
      let q = supabase
        .from("products")
        .select("id, name, sku, cost_price, sale_price, stock_qty, min_stock, expires_at, active")
        .eq("company_id", companyId!);
      if (branchId) q = q.eq("branch_id", branchId);
      const { data } = await q.order("name");
      return data ?? [];
    },
  });

  const add = (p: NonNullable<typeof products>[number]) => {
    const existing = items.find((i) => i.productId === p.id);
    if (existing) {
      onChange(items.map((i) => (i.productId === p.id ? { ...i, quantity: i.quantity + 1 } : i)));
    } else {
      onChange([
        ...items,
        { productId: p.id, name: p.name, price: Number(p.sale_price), quantity: 1, stock: p.stock_qty == null ? null : Number(p.stock_qty) },
      ]);
    }
    setOpen(false);
  };

  const available = (products ?? []).filter((p) => p.active);

  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-1.5">
        <Package className="size-3.5" /> Itens da venda (opcional)
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-between" disabled={disabled}>
            <span className="text-muted-foreground">Adicionar produto/serviço…</span>
            <ChevronsUpDown className="size-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar produto/serviço…" />
            <CommandList>
              <CommandEmpty>Nenhum produto/serviço encontrado.</CommandEmpty>
              <CommandGroup>
                {available.map((p) => (
                  <CommandItem key={p.id} value={`${p.name} ${p.sku ?? ""}`} onSelect={() => add(p)}>
                    <Check className={`size-4 ${items.some((i) => i.productId === p.id) ? "opacity-100" : "opacity-0"}`} />
                    <span className="flex-1 truncate">{p.name}</span>
                    <span className="num text-xs text-muted-foreground">
                      {brl(Number(p.sale_price))} · est. {Number(p.stock_qty)}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {items.length > 0 && (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {items.map((i) => (
            <li key={i.productId} className="flex items-center gap-2 p-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{i.name}</p>
                <p className="num text-xs text-muted-foreground">{brl(i.price)} cada</p>
              </div>
              <Input
                type="number"
                min={1}
                step="1"
                className="num h-9 w-20"
                value={i.quantity}
                aria-label={`Quantidade de ${i.name}`}
                onChange={(e) =>
                  onChange(items.map((x) => (x.productId === i.productId ? { ...x, quantity: Number(e.target.value) } : x)))
                }
              />
              <span className="num w-24 text-right text-sm font-semibold">{brl(i.price * (i.quantity || 0))}</span>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Remover ${i.name}`}
                onClick={() => onChange(items.filter((x) => x.productId !== i.productId))}
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
          <li className="flex justify-between p-2.5 text-sm font-semibold">
            <span>Total dos itens</span>
            <span className="num">{brl(saleItemsTotal(items))}</span>
          </li>
        </ul>
      )}
    </div>
  );
}
