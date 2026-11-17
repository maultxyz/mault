import { SeasonalPumpkin } from "@/components/halloween-decor";
import type { EmptyStateProps } from "@/lib/interfaces/empty-state";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  size = "default",
  className,
}: EmptyStateProps) {
  const compact = size === "compact";
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 text-center",
        compact ? "py-6" : "py-16",
        className,
      )}
    >
      {Icon && (
        <div
          className={cn(
            "relative flex items-center justify-center rounded-full bg-muted text-foreground/70",
            compact ? "size-10" : "size-14",
          )}
        >
          <Icon className={compact ? "size-5" : "size-7"} />
          <SeasonalPumpkin
            className={cn(
              "absolute -right-1 -bottom-1",
              compact ? "size-3.5" : "size-4",
            )}
          />
        </div>
      )}
      <div className="flex max-w-sm flex-col gap-1">
        <p className="text-sm font-medium">{title}</p>
        {description && (
          <p className="text-xs text-foreground/70">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
