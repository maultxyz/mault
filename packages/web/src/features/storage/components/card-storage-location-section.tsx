import { DetailSection } from "@/features/cards/components/detail-section";
import { cardStorageLocationQueryOptions } from "@/features/storage/api/storage-locations";
import { STORAGE_PATH } from "@/lib/constants/storage";
import type { CardStorageLocationSectionProps } from "@/lib/interfaces/storage";
import { IconBox } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export function CardStorageLocationSection({
  scanId,
  collectionGuid,
}: CardStorageLocationSectionProps) {
  const { t } = useTranslation("storage");
  const { data: location } = useQuery(
    cardStorageLocationQueryOptions(collectionGuid, scanId),
  );
  if (!location) return null;

  return (
    <DetailSection title={t("cardLocation.heading")}>
      <Link
        to={`${STORAGE_PATH}?location=${location.guid}`}
        className="flex w-fit items-center gap-2 rounded-sm text-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <IconBox className="size-4 text-foreground/70" />
        {t("cardLocation.value", {
          name: location.name,
          position: location.position,
        })}
      </Link>
    </DetailSection>
  );
}
