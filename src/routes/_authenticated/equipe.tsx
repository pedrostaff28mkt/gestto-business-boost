import { createFileRoute } from "@tanstack/react-router";
import { Users } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export const Route = createFileRoute("/_authenticated/equipe")({
  head: () => ({
    meta: [
      { title: "Equipe — Gestto" },
      { name: "description", content: "Ponto eletrônico, checklists, auditoria e permissões por módulo." },
      { property: "og:title", content: "Equipe — Gestto" },
      { property: "og:description", content: "Gerencie ponto, tarefas e permissões da sua equipe." },
    ],
  }),
  component: () => (
    <ComingSoon
      icon={Users}
      title="Equipe"
      description="Ponto eletrônico pelo celular, checklist de tarefas para produção, log de auditoria completo e gestão de permissões por módulo — a base de permissões já está ativa no banco de dados."
      items={["Ponto eletrônico", "Checklist de tarefas", "Log de auditoria", "Permissões por módulo"]}
    />
  ),
});
