import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 py-16 text-center text-muted-foreground",
        className,
      )}
    >
      {icon}
      <div>
        <p className="text-sm font-medium">{title}</p>
        {description && <p className="text-sm">{description}</p>}
      </div>
      {action}
    </div>
  );
}
