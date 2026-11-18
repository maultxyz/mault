import { Button } from "@/components/ui/button";
import { useStoragePlan } from "@/features/bins/api/use-storage-plan";
import type { StoragePlanSummaryRowProps } from "@/lib/interfaces/bins";
import { useTranslation } from "react-i18next";

export function StoragePlanSummaryRow({ onOpen }: StoragePlanSummaryRowProps) {
  const { t } = useTranslation("bins");
  const { summary } = useStoragePlan();
  const value =
    summary.total === 0
      ? t("storagePlan.summary.off")
      : t(
          summary.total === 1
            ? "storagePlan.summary.single"
            : "storagePlan.summary.range",
          {
            first: summary.firstName,
            last: summary.lastName,
            full: summary.full,
            total: summary.total,
          },
        );
  return (
    <div className="flex items-center gap-2 border-t pt-2">
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-xs font-medium">
          {t("storagePlan.summary.label")}
        </span>
        <span className="truncate text-xs text-foreground/70">{value}</span>
      </div>
      <Button variant="outline" className="shrink-0" onClick={onOpen}>
        {summary.total === 0
          ? t("storagePlan.summary.setUp")
          : t("storagePlan.summary.open")}
      </Button>
    </div>
  );
}
