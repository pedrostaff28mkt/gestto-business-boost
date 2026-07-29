import type { LucideIcon } from "lucide-react";
import { Check } from "lucide-react";

export function ComingSoon({
  icon: Icon,
  title,
  description,
  items,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  items: string[];
}) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-sm text-muted-foreground">Módulo em construção no roadmap do Gestto.</p>
      </div>
      <div className="surface p-6">
        <span className="flex size-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
          <Icon className="size-5" />
        </span>
        <p className="mt-4 text-sm text-muted-foreground">{description}</p>
        <ul className="mt-4 space-y-2 text-sm">
          {items.map((item) => (
            <li key={item} className="flex items-center gap-2">
              <Check className="size-4 text-success" /> {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
