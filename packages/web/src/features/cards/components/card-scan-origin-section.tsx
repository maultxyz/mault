import { DetailSection } from "@/features/cards/components/detail-section";
import { cardScanOriginQueryOptions } from "@/features/collections/api/collections";
import type { CardScanOriginSectionProps } from "@/lib/interfaces/cards";
import { IconDeviceDesktop, IconUser } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

export function CardScanOriginSection({
  scanId,
  collectionGuid,
}: CardScanOriginSectionProps) {
  const { t } = useTranslation("cards");
  const { data: origin } = useQuery(
    cardScanOriginQueryOptions(collectionGuid, scanId),
  );
  if (!origin || (!origin.scannedBy && !origin.device)) return null;

  return (
    <DetailSection title={t("scanOrigin.heading")}>
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
    </DetailSection>
  );
}
