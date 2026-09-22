import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useGestto } from "@/hooks/use-gestto";

export type Branch = { id: string; name: string; is_main: boolean };

type ActiveBranchContextValue = {
  /** "all" = visão geral (todas as filiais) ou o id de uma filial. */
  activeBranch: string;
  setActiveBranch: (value: string) => void;
  branches: Branch[];
  /** Só o dono escolhe a filial ativa. */
  canSwitch: boolean;
  /** Filial usada para filtrar leituras (null = sem filtro). */
  filterBranchId: string | null;
  /** Filial usada ao gravar registros (null = indefinida). */
  writeBranchId: string | null;
};

const ActiveBranchContext = createContext<ActiveBranchContextValue | null>(null);

const storageKey = (companyId: string) => `gestto-active-branch-${companyId}`;

export function useBranches(companyId?: string) {
  return useQuery({
    queryKey: ["branches", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("branches")
        .select("id, name, is_main")
        .eq("company_id", companyId!)
        .order("is_main", { ascending: false })
        .order("name");
      if (error) throw error;
      return (data ?? []) as Branch[];
    },
  });
}

export function ActiveBranchProvider({ children }: { children: ReactNode }) {
  const { session } = useGestto();
  const companyId = session?.companyId;
  const isOwner = session?.role === "owner";
  const { data: branches } = useBranches(companyId);
  const [activeBranch, setActive] = useState<string>("all");

  useEffect(() => {
    if (!companyId || typeof window === "undefined") return;
    const stored = window.localStorage.getItem(storageKey(companyId));
    setActive(stored || "all");
  }, [companyId]);

  const setActiveBranch = (value: string) => {
    setActive(value);
    if (companyId && typeof window !== "undefined") {
      window.localStorage.setItem(storageKey(companyId), value);
    }
  };

  const value = useMemo<ActiveBranchContextValue>(() => {
    const list = branches ?? [];
    const valid = activeBranch !== "all" && list.some((b) => b.id === activeBranch) ? activeBranch : "all";
    if (!isOwner) {
      return {
        activeBranch: "all",
        setActiveBranch,
        branches: list,
        canSwitch: false,
        filterBranchId: null,
        writeBranchId: session?.branchId ?? null,
      };
    }
    return {
      activeBranch: valid,
      setActiveBranch,
      branches: list,
      canSwitch: true,
      filterBranchId: valid === "all" ? null : valid,
      writeBranchId: valid === "all" ? null : valid,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branches, activeBranch, isOwner, session?.branchId, companyId]);

  return <ActiveBranchContext.Provider value={value}>{children}</ActiveBranchContext.Provider>;
}

export function useActiveBranch(): ActiveBranchContextValue {
  const ctx = useContext(ActiveBranchContext);
  if (ctx) return ctx;
  return {
    activeBranch: "all",
    setActiveBranch: () => {},
    branches: [],
    canSwitch: false,
    filterBranchId: null,
    writeBranchId: null,
  };
}
