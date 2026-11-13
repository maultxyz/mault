import type { HomeHighlightRowProps } from "@/lib/interfaces/home";
import { cn } from "@/lib/utils";
import { IconChevronRight } from "@tabler/icons-react";
import { Link } from "react-router-dom";

export function HomeHighlightRow({ icon: RowIcon, tone, title, description, to }: HomeHighlightRowProps) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-card bg-card p-4 md:p-2.5 transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <span
        aria-hidden
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full",
          tone === "warning" && "bg-warning-muted text-warning-foreground",
          tone === "success" && "bg-success-muted text-success-foreground",
          tone === "primary" && "bg-primary/10 text-primary dark:bg-primary/20 dark:text-sidebar-primary",
        )}
      >
        <RowIcon className="size-4" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-semibold text-foreground">{title}</span>
        <span className="line-clamp-2 text-xs text-foreground/70">{description}</span>
      </span>
      <IconChevronRight aria-hidden className="size-4 shrink-0 text-foreground/70" />
    </Link>
  );
}
