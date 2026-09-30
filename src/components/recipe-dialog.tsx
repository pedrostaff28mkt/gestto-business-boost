import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Layers, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usePaywall } from "@/components/paywall";
import { num } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

type P = { id: string; name: string };

export function RecipeDialog({ companyId, product, products }: { companyId: string; product: P; products: P[] }) {
  const qc = useQueryClient();
  const { guard } = usePaywall();
  const [open, setOpen] = useState(false);
  const [pickOpen, setPickOpen] = useState(false);
  const [input, setInput] = useState<P | null>(null);
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState("un");

  const key = ["recipe", product.id];
  const { data: items, isLoading } = useQuery({
    queryKey: key,
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recipe_items")
        .select("id, input_product_id, quantity, unit")
        .eq("product_id", product.id)
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  const nameOf = (id: string) => products.find((p) => p.id === id)?.name ?? "Produto/serviço removido";
  const options = products.filter((p) => p.id !== product.id);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: key });
    qc.invalidateQueries({ queryKey: ["recipe-products", companyId] });
  };

  const add = useMutation({
    mutationFn: async () => {
      const q = Number(qty.replace(",", "."));
      if (!input) throw new Error("Escolha um insumo.");
      if (!(q > 0)) throw new Error("Informe uma quantidade maior que zero.");
      if (!unit.trim()) throw new Error("Informe a unidade.");
      const { error } = await supabase.from("recipe_items").insert({
        company_id: companyId,
        product_id: product.id,
        input_product_id: input.id,
        quantity: q,
        unit: unit.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Insumo adicionado");
      setInput(null);
      setQty("");
      refresh();
    },
    onError: (e: Error) => toast.error("Não foi possível adicionar", { description: e.message }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("recipe_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Insumo removido");
      refresh();
    },
    onError: (e: Error) => toast.error("Não foi possível remover", { description: e.message }),
  });

  return (
    <>
      <Button variant="outline" size="sm" className="h-8 gap-1.5 px-2.5" onClick={() => setOpen(true)} aria-label={`Ficha técnica de ${product.name}`}>
        <Layers className="size-3.5" />
        <span className="hidden sm:inline">Ficha técnica</span>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>Ficha técnica de {product.name}</DialogTitle>
          </DialogHeader>

          {isLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
          ) : !items?.length ? (
            <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
              Nenhum insumo cadastrado ainda.
            </p>
          ) : (
            <ul className="divide-y divide-border rounded-xl border border-border">
              {items.map((it) => (
                <li key={it.id} className="flex items-center gap-2 p-2.5">
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{nameOf(it.input_product_id)}</span>
                  <span className="num text-sm text-muted-foreground">{num(Number(it.quantity), 3)} {it.unit}</span>
                  <Button variant="ghost" size="icon" aria-label="Remover insumo" disabled={remove.isPending}
                    onClick={() => guard(() => remove.mutate(it.id))}>
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </li>
              ))}
            </ul>
          )}

          <div className="space-y-3 border-t border-border pt-4">
            <p className="text-sm font-semibold">Adicionar insumo</p>
            <Popover open={pickOpen} onOpenChange={setPickOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  <span className={input ? "" : "text-muted-foreground"}>{input?.name ?? "Escolher produto/serviço…"}</span>
                  <ChevronsUpDown className="size-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Buscar produto/serviço…" />
                  <CommandList>
                    <CommandEmpty>Nenhum produto/serviço encontrado.</CommandEmpty>
                    <CommandGroup>
                      {options.map((p) => (
                        <CommandItem key={p.id} value={`${p.name} ${p.id}`} onSelect={() => { setInput(p); setPickOpen(false); }}>
                          <Check className={`size-4 ${input?.id === p.id ? "opacity-100" : "opacity-0"}`} />
                          <span className="truncate">{p.name}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="rq">Quantidade</Label>
                <Input id="rq" type="number" min={0} step="any" className="num" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ru">Unidade</Label>
                <Input id="ru" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="g, un, ml, kg" />
              </div>
            </div>
            <Button className="w-full" disabled={add.isPending || !input} onClick={() => guard(() => add.mutate())}>
              {add.isPending && <Loader2 className="size-4 animate-spin" />} Adicionar insumo
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
