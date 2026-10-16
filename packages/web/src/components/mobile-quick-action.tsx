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
      <span className="flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground [&_svg]:size-6">
        {icon}
      </span>
      <span className="truncate text-xs font-semibold text-foreground">
        {label}
      </span>
    </>
  );
  const className = cn(
    "flex min-w-0 flex-1 flex-col items-center gap-2 transition-transform active:scale-95 motion-reduce:active:scale-100 disabled:opacity-50",
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
