import { Badge } from "@/components/ui/badge";
import { STORAGE_PLAN_STATUS_BADGE_VARIANT } from "@/lib/constants/bins";
import type { StoragePlanStatusBadgeProps } from "@/lib/interfaces/bins";
import { useTranslation } from "react-i18next";

export function StoragePlanStatusBadge({ row }: StoragePlanStatusBadgeProps) {
  const { t } = useTranslation("bins");
  return (
    <Badge variant={STORAGE_PLAN_STATUS_BADGE_VARIANT[row.status]}>
      {row.status === "filling"
        ? t("storagePlan.status.filling", { number: row.fillingBinNumber })
        : t(`storagePlan.status.${row.status}`)}
    </Badge>
  );
}
