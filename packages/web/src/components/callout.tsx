import {
  CALLOUT_ICON_CLASS,
  CALLOUT_VARIANT_CLASS,
} from "@/lib/constants/colors";
import type { CalloutProps } from "@/lib/interfaces/callout";
import { cn } from "@/lib/utils";

export function Callout({
  variant = "neutral",
  icon: Icon,
  title,
  action,
  className,
  children,
}: CalloutProps) {
  return (
    <div
      role={variant === "error" || variant === "warning" ? "alert" : undefined}
      className={cn(
        "flex items-start gap-2 rounded-lg border px-3 py-2 text-xs",
        CALLOUT_VARIANT_CLASS[variant],
        className,
      )}
    >
      {Icon && (
        <Icon className={cn("mt-px size-4 shrink-0", CALLOUT_ICON_CLASS[variant])} />
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {title && <p className="font-medium">{title}</p>}
        {children && <div>{children}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
