import { useState } from "react";
import { Building2, Check, ChevronDown, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { setActiveCompany, useGestto } from "@/hooks/use-gestto";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function CompanySwitcher() {
  const { session } = useGestto();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  if (!session) return null;
  const isOwnerAnywhere = session.companies.some((c) => c.role === "owner");
  if (session.companies.length <= 1 && !isOwnerAnywhere) return null;

  async function create() {
    if (!session) return;
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      toast.error("Informe um nome com pelo menos 2 caracteres");
      return;
    }
    setSaving(true);
    const { data, error } = await supabase.rpc("create_additional_company", { _company_name: trimmed });
    if (error || !data) {
      setSaving(false);
      toast.error("Não foi possível criar a empresa", { description: error?.message });
      return;
    }
    toast.success("Empresa criada");
    setActiveCompany(session.userId, data as string);
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Building2 className="size-4 shrink-0" />
            <span className="max-w-[110px] truncate sm:max-w-[200px]">{session.companyName}</span>
            <ChevronDown className="size-3.5 shrink-0 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuLabel>Suas empresas</DropdownMenuLabel>
          {session.companies.map((c) => {
            const active = c.id === session.companyId;
            return (
              <DropdownMenuItem
                key={c.id}
                onSelect={() => {
                  if (!active) setActiveCompany(session.userId, c.id);
                }}
                className="gap-2"
              >
                <Check className={`size-4 shrink-0 ${active ? "opacity-100" : "opacity-0"}`} />
                <span className="truncate">{c.name}</span>
              </DropdownMenuItem>
            );
          })}
          {isOwnerAnywhere && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setOpen(true)} className="gap-2">
                <Plus className="size-4" /> Nova empresa
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova empresa</DialogTitle>
            <DialogDescription>
              A nova empresa usa a mesma assinatura. Os dados ficam totalmente separados.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="new-company-name">Nome da empresa</Label>
            <Input
              id="new-company-name"
              value={name}
              maxLength={120}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && create()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={create} disabled={saving || name.trim().length < 2}>
              {saving && <Loader2 className="size-4 animate-spin" />} Criar empresa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
