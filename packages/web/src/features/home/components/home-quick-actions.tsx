import type { HomeQuickActionsProps } from "@/lib/interfaces/home";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

export function HomeQuickActions({ actions }: HomeQuickActionsProps) {
  return (
    <ul className="grid grid-cols-3 gap-2">
      {actions.map((action) => {
        const ActionIcon = action.icon;
        const className = cn(
                "flex h-full flex-col items-center gap-2 rounded-card px-2 py-4 text-center text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                action.isPrimary
                  ? "bg-primary text-primary-foreground hover:bg-primary-hover"
                  : "bg-card text-foreground hover:bg-muted",
        );
        const content = (
          <>
              <span
                aria-hidden
                className={cn(
                  "flex size-10 items-center justify-center rounded-full",
                  action.isPrimary
                    ? "bg-primary-foreground/15"
                    : "bg-primary/10 text-primary dark:bg-primary/20 dark:text-sidebar-primary",
                )}
              >
                <ActionIcon className="size-5" />
              </span>
              {action.label}
          </>
        );
        return (
          <li key={action.key}>
            {action.to ? (
              <Link to={action.to} className={className}>
                {content}
              </Link>
            ) : (
              <button type="button" onClick={action.onSelect} className={cn(className, "w-full")}>
                {content}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
