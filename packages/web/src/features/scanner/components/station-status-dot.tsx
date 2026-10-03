import type { StationStatusDotProps } from "@/lib/interfaces/stations";
import { cn } from "@/lib/utils";

export function StationStatusDot({ status }: StationStatusDotProps) {
  return (
    <span
      className={cn(
        "size-2 shrink-0 rounded-full",
        status === "sorting" && "bg-success motion-safe:animate-pulse",
        status === "paused" && "bg-warning",
        status === "offline" && "bg-foreground/30",
      )}
    />
  );
}
