import type { KbdProps } from "@/lib/interfaces/hotkeys";
import { cn } from "@/lib/utils";

export function Kbd({ children, className }: KbdProps) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-sm border border-border bg-muted px-1 font-mono text-2xs font-medium text-foreground/80",
        className,
      )}
    >
      {children}
    </kbd>
  );
}
