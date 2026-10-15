import { Badge } from "@/components/ui/badge";
import type { StorageLocationBadgeProps } from "@/lib/interfaces/cards";
import { cn } from "@/lib/utils";
import { IconBox } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function StorageLocationBadge({
  location,
  className,
}: StorageLocationBadgeProps) {
  const { t } = useTranslation("cards");
  return (
    <Badge
      variant="secondary"
      className={cn("min-w-0 max-w-full shrink", className)}
      title={t("scannedCardItem.storageTooltip", {
        name: location.name,
        position: location.position,
      })}
    >
      <IconBox />
      <span className="truncate">
        {t("scannedCardItem.storage", {
          name: location.name,
          position: location.position,
        })}
      </span>
    </Badge>
  );
}
