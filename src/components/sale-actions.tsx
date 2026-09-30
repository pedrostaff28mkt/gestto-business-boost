import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type Sale = {
  id: string;
  gross_amount: number;
  fee_amount: number;
  note: string | null;
  itemsSummary: string | null;
};

export function SaleActions({
  sale,
  canEdit,
  canDelete,
  companyId,
  guard,
}: {
  sale: Sale;
  canEdit: boolean;
  canDelete: boolean;
  companyId: string;
  guard: (fn: () => void) => void;
}) {
  const qc = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const hasItems = !!sale.itemsSummary;

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["sales", companyId] });
    qc.invalidateQueries({ queryKey: ["products", companyId] });
    qc.invalidateQueries({ queryKey: ["dashboard", companyId] });
  };

  const del = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase.rpc as unknown as (
        fn: string,
        args: Record<string, unknown>,
      ) => Promise<{ error: { message: string } | null }>)("delete_sale", { _sale_id: sale.id });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Venda excluída");
      setDelOpen(false);
      invalidate();
    },
    onError: (e: Error) => toast.error("Não foi possível excluir", { description: e.message }),
  });

  const edit = useMutation({
    mutationFn: async () => {
      const gross = Number(amount.replace(/\./g, "").replace(",", ".")) || 0;
      if (gross <= 0) throw new Error("Informe um valor maior que zero.");
      const { data, error } = await supabase
        .from("sales")
        .update({ gross_amount: gross, net_amount: gross - Number(sale.fee_amount), note: note.trim() || null })
        .eq("id", sale.id)
        .select("id");
      if (error) throw error;
      if (!data?.length) throw new Error("Só o dono ou gerente pode editar uma venda.");
    },
    onSuccess: () => {
      toast.success("Venda atualizada");
      setEditOpen(false);
      invalidate();
    },
    onError: (e: Error) => toast.error("Não foi possível salvar", { description: e.message }),
  });

  if (!canEdit && !canDelete) return null;

  return (
    <div className="flex shrink-0 items-center">
      {canEdit &&
        (hasItems ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button variant="ghost" size="icon" disabled aria-label="Editar venda">
                    <Pencil className="size-4" />
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>Vendas com produtos vinculados não podem ser editadas — exclua e lance novamente</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Editar venda"
            onClick={() =>
              guard(() => {
                setAmount(Number(sale.gross_amount).toFixed(2).replace(".", ","));
                setNote(sale.note ?? "");
                setEditOpen(true);
              })
            }
          >
            <Pencil className="size-4" />
          </Button>
        ))}
      {canDelete && (
        <Button variant="ghost" size="icon" aria-label="Excluir venda" onClick={() => guard(() => setDelOpen(true))}>
          <Trash2 className="size-4 text-destructive" />
        </Button>
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Editar venda</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-amount">Valor (R$)</Label>
              <Input id="edit-amount" inputMode="decimal" className="num" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-note">Observação</Label>
              <Textarea id="edit-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
            <Button className="w-full" disabled={edit.isPending} onClick={() => edit.mutate()}>
              {edit.isPending && <Loader2 className="size-4 animate-spin" />} Salvar alterações
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={delOpen} onOpenChange={setDelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir esta venda?</AlertDialogTitle>
            <AlertDialogDescription>
              O estoque dos produtos vendidos será devolvido automaticamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={del.isPending}
              onClick={(e) => {
                e.preventDefault();
                del.mutate();
              }}
            >
              {del.isPending && <Loader2 className="size-4 animate-spin" />} Excluir
            </AlertDialogAction>
          </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
