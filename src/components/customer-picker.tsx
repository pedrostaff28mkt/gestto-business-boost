import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronsUpDown, UserPlus, UserRound } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useGestto } from "@/hooks/use-gestto";
import { useActiveBranch } from "@/hooks/use-active-branch";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type CustomerLite = { id: string; name: string; phone: string | null };

export function useCustomersLite(companyId?: string, branchId?: string | null) {
  return useQuery({
    queryKey: ["customers", companyId, "lite", branchId ?? "none"],
    enabled: !!companyId && !!branchId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("id, name, phone")
        .eq("company_id", companyId!)
        .eq("branch_id", branchId!)
        .order("name");
      if (error) throw error;
      return (data ?? []) as CustomerLite[];
    },
  });
}

/** Campo opcional "Cliente" para vendas. value null = Cliente avulso. */
export function CustomerPicker({
  value,
  onChange,
  disabled,
}: {
  value: string | null;
  onChange: (id: string | null) => void;
  disabled?: boolean;
}) {
  const { session, can } = useGestto();
  const companyId = session?.companyId;
  const queryClient = useQueryClient();
  const { writeBranchId } = useActiveBranch();
  const { data: customers = [] } = useCustomersLite(companyId, writeBranchId);
  const [open, setOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const selected = customers.find((c) => c.id === value);

  const quickCreate = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Informe o nome");
      if (!writeBranchId) throw new Error("Selecione uma filial no topo da tela para continuar");
      const { data, error } = await supabase
        .from("customers")
        .insert({ company_id: companyId!, branch_id: writeBranchId, name: name.trim(), phone: phone.trim() || null, tags: ["Novo"] })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ["customers", companyId] });
      onChange(id);
      setQuickOpen(false);
      setName("");
      setPhone("");
      toast.success("Cliente cadastrado");
    },
    onError: (e: Error) => toast.error("Erro ao cadastrar cliente", { description: e.message }),
  });

  if (!can("crm")) return null;

  return (
    <div className="space-y-1.5">
      <Label>Cliente (opcional)</Label>
      <div className="flex gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" disabled={disabled} className="flex-1 justify-between font-normal">
              <span className="flex items-center gap-2 truncate">
                <UserRound className="size-4 text-muted-foreground" />
                {selected ? selected.name : "Cliente avulso"}
              </span>
              <ChevronsUpDown className="size-4 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-0" align="start">
            <Command>
              <CommandInput placeholder="Buscar por nome ou telefone..." />
              <CommandList>
                <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                <CommandGroup>
                  <CommandItem value="__avulso Cliente avulso" onSelect={() => { onChange(null); setOpen(false); }}>
                    <Check className={`size-4 ${value === null ? "opacity-100" : "opacity-0"}`} />
                    Cliente avulso
                  </CommandItem>
                  {customers.map((c) => (
                    <CommandItem
                      key={c.id}
                      value={`${c.name} ${c.phone ?? ""} ${c.id}`}
                      onSelect={() => { onChange(c.id); setOpen(false); }}
                    >
                      <Check className={`size-4 ${value === c.id ? "opacity-100" : "opacity-0"}`} />
                      <span className="truncate">{c.name}</span>
                      {c.phone && <span className="ml-auto text-xs text-muted-foreground">{c.phone}</span>}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {can("crm", "create") && (
          <Button variant="outline" size="icon" disabled={disabled} onClick={() => setQuickOpen(true)} aria-label="Novo cliente">
            <UserPlus className="size-4" />
          </Button>
        )}
      </div>

      <Dialog open={quickOpen} onOpenChange={setQuickOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo cliente rápido</DialogTitle>
          </DialogHeader>
          {!writeBranchId && (
            <p className="rounded-lg border border-warning/40 bg-warning-soft p-3 text-sm font-medium">
              Selecione uma filial no topo da tela para continuar
            </p>
          )}
          <fieldset disabled={!writeBranchId} className="space-y-3 disabled:opacity-60">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Telefone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-9999" />
            </div>
          </fieldset>
          <DialogFooter>
            <Button onClick={() => quickCreate.mutate()} disabled={quickCreate.isPending || !writeBranchId}>
              Salvar e selecionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
