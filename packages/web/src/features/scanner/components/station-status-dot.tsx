import { STATUS_DOT_OFFLINE_CLASS } from "@/lib/constants/ui";
import type { StationStatusDotProps } from "@/lib/interfaces/stations";
import { cn } from "@/lib/utils";
import {
  IconAlertTriangleFilled,
  IconPlayerPauseFilled,
} from "@tabler/icons-react";

export function StationStatusDot({ status }: StationStatusDotProps) {
  return (
    <span
      aria-hidden
      data-status={status}
      className="grid size-3 shrink-0 place-items-center"
    >
      {status === "attention" ? (
        <IconAlertTriangleFilled className="size-3 text-destructive" />
      ) : status === "paused" ? (
        <IconPlayerPauseFilled className="size-3 text-warning-foreground" />
      ) : (
        <span
          className={cn(
            "size-2 rounded-full",
            status === "sorting" &&
              "bg-success-foreground motion-safe:animate-pulse",
            status === "offline" && STATUS_DOT_OFFLINE_CLASS,
          )}
        />
      )}
    </span>
  );
}
