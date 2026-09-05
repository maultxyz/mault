import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function getInitials(name: string | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

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
  const sizeClass = size === "sm" ? "size-5 text-[9px]" : "size-6 text-[10px]";
  const colorClass =
    variant === "scanner"
      ? "bg-amber-500/15 text-amber-800 dark:text-amber-400 ring-1 ring-amber-500/30"
      : variant === "neutral"
        ? "bg-muted text-muted-foreground ring-1 ring-border"
        : "bg-green-500/15 text-green-800 dark:text-green-400 ring-1 ring-green-500/30";

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
