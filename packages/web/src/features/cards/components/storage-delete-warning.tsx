import { Callout } from "@/components/callout";
import type { StorageDeleteWarningProps } from "@/lib/interfaces/cards";
import { IconBox } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function StorageDeleteWarning({
  storedCount,
  total,
  location,
  className,
}: StorageDeleteWarningProps) {
  const { t } = useTranslation("cards");
  if (storedCount <= 0) return null;

  return (
    <Callout variant="warning" icon={IconBox} className={className}>
      {location && total === 1
        ? t("storageDeleteWarning.single", {
            name: location.name,
            position: location.position,
          })
        : storedCount === total
          ? t("storageDeleteWarning.all", { count: storedCount })
          : t("storageDeleteWarning.some", { count: storedCount, total })}
    </Callout>
  );
}
