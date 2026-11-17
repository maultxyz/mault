import { IconBadge } from "@/components/icon-badge";
import type { HomeHighlightRowProps } from "@/lib/interfaces/home";
import { IconChevronRight } from "@tabler/icons-react";
import { Link } from "react-router-dom";

export function HomeHighlightRow({ icon: RowIcon, tone, title, description, to }: HomeHighlightRowProps) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-card bg-card p-4 md:p-2.5 transition-colors hover:bg-foreground/6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <IconBadge aria-hidden tone={tone}>
        <RowIcon className="size-4" />
      </IconBadge>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-semibold text-foreground">{title}</span>
        <span className="line-clamp-2 text-xs text-foreground/70">{description}</span>
      </span>
      <IconChevronRight aria-hidden className="size-4 shrink-0 text-foreground/70" />
    </Link>
  );
}
