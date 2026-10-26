import type { CardScanOriginListProps } from "@/lib/interfaces/cards";
import { IconDeviceDesktop, IconUser } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function CardScanOriginList({ origin }: CardScanOriginListProps) {
  const { t } = useTranslation("cards");

  return (
    <dl className="flex flex-col gap-1.5 text-sm">
      {origin.scannedBy && (
        <div className="flex items-center gap-2">
          <IconUser className="size-4 shrink-0 text-foreground/70" />
          <dt className="text-foreground/70">{t("scanOrigin.scannedBy")}</dt>
          <dd className="min-w-0 truncate font-medium">
            {origin.scannedBy.name}
          </dd>
        </div>
      )}
      {origin.device && (
        <div className="flex items-center gap-2">
          <IconDeviceDesktop className="size-4 shrink-0 text-foreground/70" />
          <dt className="text-foreground/70">{t("scanOrigin.sorter")}</dt>
          <dd className="min-w-0 truncate font-medium">
            {origin.device.isDeleted
              ? t("scanOrigin.deletedSorter", { name: origin.device.name })
              : origin.device.name}
          </dd>
        </div>
      )}
    </dl>
  );
}
