import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Store, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useGestto } from "@/hooks/use-gestto";
import { useBranches } from "@/hooks/use-active-branch";
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

export function BranchesSection() {
  const { session } = useGestto();
  const companyId = session?.companyId;
  const queryClient = useQueryClient();
  const { data: branches } = useBranches(companyId);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  const createBranch = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("branches")
        .insert({ company_id: companyId!, name: name.trim(), is_main: false });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Filial criada");
      setName("");
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["branches", companyId] });
    },
    onError: (e: Error) => toast.error("Erro ao criar filial", { description: e.message }),
  });

  return (
    <div className="surface space-y-4 p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Store className="size-4 text-primary" />
          <h2 className="font-display text-lg font-semibold">Filiais</h2>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="gap-1.5">
              <Plus className="size-4" /> Nova filial
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl">
            <DialogHeader>
              <DialogTitle>Nova filial</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="branch-name">Nome da filial</Label>
                <Input
                  id="branch-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Loja 2"
                />
              </div>
              <Button
                className="w-full"
                disabled={createBranch.isPending || !name.trim()}
                onClick={() => createBranch.mutate()}
              >
                {createBranch.isPending && <Loader2 className="size-4 animate-spin" />} Criar filial
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {!branches?.length ? (
        <p className="text-sm text-muted-foreground">Nenhuma filial cadastrada ainda.</p>
      ) : (
        <ul className="divide-y divide-border">
          {branches.map((b) => (
            <li key={b.id} className="flex items-center justify-between gap-3 py-2.5">
              <span className="truncate text-sm font-medium">{b.name}</span>
              {b.is_main && <Badge variant="secondary">Matriz</Badge>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
