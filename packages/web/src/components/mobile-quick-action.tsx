import type { MobileQuickActionProps } from "@/lib/interfaces/nav";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

export function MobileQuickAction({
  icon,
  label,
  to,
  className: extraClassName,
  ...props
}: MobileQuickActionProps) {
  const content = (
    <>
      <span className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary dark:bg-primary/20 [&_svg]:size-4">
        {icon}
      </span>
      <span className="max-w-full truncate px-1 text-xs font-medium text-foreground">
        {label}
      </span>
    </>
  );
  const className = cn(
    "flex min-w-0 flex-1 flex-col items-center gap-1.5 rounded-lg bg-card py-3 ring-1 ring-border transition-colors active:bg-muted disabled:opacity-50",
    extraClassName,
  );

  if (to) {
    return (
      <Link to={to} className={className}>
        {content}
      </Link>
    );
  }
  return (
    <button type="button" {...props} className={className}>
      {content}
    </button>
  );
}
