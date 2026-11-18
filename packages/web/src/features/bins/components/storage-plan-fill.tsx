import { Progress } from "@/components/ui/progress";
import type { StoragePlanFillProps } from "@/lib/interfaces/bins";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export function StoragePlanFill({ row, className }: StoragePlanFillProps) {
  const { t } = useTranslation("bins");
  if (row.capacity == null) {
    return (
      <span className={cn("text-xs text-foreground/70", className)}>
        {t("storagePlan.noCapacity", { used: row.usedSlots })}
      </span>
    );
  }
  return (
    <div className={cn("flex min-w-0 items-center gap-2", className)}>
      <Progress
        decorative
        size="sm"
        value={row.usedSlots}
        max={row.capacity}
        className="min-w-12 flex-1"
      />
      <span className="shrink-0 text-xs tabular-nums text-foreground/70">
        {t("storagePlan.fillText", { used: row.usedSlots, capacity: row.capacity })}
      </span>
    </div>
  );
}
