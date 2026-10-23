import { Badge } from "@/components/ui/badge";
import { STATUS_BADGE_VARIANTS } from "@/lib/constants/business";
import type { StatusBadgeProps } from "@/lib/interfaces/business";
import { useTranslation } from "react-i18next";

export function StatusBadge({ status }: StatusBadgeProps) {
  const { t } = useTranslation("business");
  return (
    <Badge variant={STATUS_BADGE_VARIANTS[status]}>
      {t(`status.${status}`)}
    </Badge>
  );
}
