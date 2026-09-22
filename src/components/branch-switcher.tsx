import { Store } from "lucide-react";
import { useActiveBranch } from "@/hooks/use-active-branch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function BranchSwitcher() {
  const { canSwitch, branches, activeBranch, setActiveBranch } = useActiveBranch();
  if (!canSwitch) return null;

  return (
    <div className="flex items-center gap-1.5">
      <Store className="size-4 shrink-0 text-muted-foreground" />
      <Select value={activeBranch} onValueChange={setActiveBranch}>
        <SelectTrigger className="h-9 w-[190px] text-sm" aria-label="Filial ativa">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Visão geral (todas as filiais)</SelectItem>
          {branches.map((b) => (
            <SelectItem key={b.id} value={b.id}>
              {b.name}
              {b.is_main ? " (Matriz)" : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
