import { IconBadge } from "@/components/icon-badge";
import type { MobileIconBadgeProps } from "@/lib/interfaces/nav";
import { cn } from "@/lib/utils";

export function MobileIconBadge({
  children,
  tone = "neutral",
  className,
}: MobileIconBadgeProps) {
  return (
    <IconBadge
      size="sm"
      tone={tone}
      className={cn("text-xs font-semibold [&_svg]:size-4", className)}
    >
      {children}
    </IconBadge>
  );
}
