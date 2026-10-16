import type { MobileIconBadgeProps } from "@/lib/interfaces/nav";
import { cn } from "@/lib/utils";

export function MobileIconBadge({
  children,
  tone = "neutral",
  className,
}: MobileIconBadgeProps) {
  return (
    <span
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold [&_svg]:size-5",
        tone === "neutral" && "bg-muted text-foreground",
        tone === "primary" && "bg-primary/10 text-primary dark:bg-primary/20 dark:text-sidebar-primary",
        tone === "destructive" && "bg-destructive/10 text-destructive",
        tone === "warning" && "bg-warning-muted text-warning-foreground",
        tone === "success" && "bg-success-muted text-success-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}
