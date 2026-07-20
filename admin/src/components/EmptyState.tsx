import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-16 text-center">
      <Icon className="size-10 text-muted-foreground" />
      <p className="text-lg font-medium">{title}</p>
      {description && <p className="text-muted-foreground">{description}</p>}
      {action}
    </div>
  );
}
