import type { MobileQuickActionProps } from "@/lib/interfaces/nav";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

export function MobileQuickAction({
  icon,
  label,
  hint,
  to,
  className: extraClassName,
  ...props
}: MobileQuickActionProps) {
  const content = (
    <>
      <span className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary dark:bg-primary/20 [&_svg]:size-4">
        {icon}
      </span>
      <span className="flex w-full min-w-0 flex-col gap-0.5">
        <span className="truncate text-sm font-medium text-foreground">
          {label}
        </span>
        {hint && (
          <span className="truncate text-xs text-foreground/70">{hint}</span>
        )}
      </span>
    </>
  );
  const className = cn(
    "flex min-w-0 flex-col items-start gap-2.5 border-r border-input p-3 text-left transition-colors last:border-r-0 active:bg-input/40 disabled:opacity-50",
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
