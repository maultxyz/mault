import { getInitials } from "@magic-vault/shared";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface InitialsAvatarProps {
  name: string;
  variant?: "watcher" | "scanner" | "neutral";
  size?: "sm" | "md";
  tooltip?: string;
}

export function InitialsAvatar({
  name,
  variant = "watcher",
  size = "md",
  tooltip,
}: InitialsAvatarProps) {
  const sizeClass = size === "sm" ? "size-5 text-2xs" : "size-6 text-2xs";
  const colorClass =
    variant === "scanner"
      ? "bg-warning-muted text-warning-foreground ring-1 ring-warning-border"
      : variant === "neutral"
        ? "bg-muted text-muted-foreground ring-1 ring-border"
        : "bg-success-muted text-success-foreground ring-1 ring-success-border";

  const avatar = (
    <span
      className={`inline-flex items-center justify-center rounded-full font-semibold shrink-0 cursor-default ${sizeClass} ${colorClass}`}
    >
      {getInitials(name)}
    </span>
  );

  if (!tooltip) return avatar;

  return (
    <Tooltip>
      <TooltipTrigger render={avatar} />
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}
