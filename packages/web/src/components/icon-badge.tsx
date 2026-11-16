import {
  ICON_BADGE_SIZE_CLASS,
  ICON_BADGE_TONE_CLASS,
} from "@/lib/constants/ui";
import type { IconBadgeProps } from "@/lib/interfaces/icon-badge";
import { cn } from "@/lib/utils";

export function IconBadge({
  size = "default",
  tone = "primary",
  className,
  ...props
}: IconBadgeProps) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full",
        ICON_BADGE_SIZE_CLASS[size],
        ICON_BADGE_TONE_CLASS[tone],
        className,
      )}
      {...props}
    />
  );
}
