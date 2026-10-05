import { DeleteDialog } from "@/components/delete-dialog";
import { Button } from "@/components/ui/button";
import { DetailSection } from "@/features/cards/components/detail-section";
import { cardStorageLocationQueryOptions } from "@/features/storage/api/storage-locations";
import { useRemoveCardFromLocation } from "@/features/storage/api/use-storage-locations";
import { STORAGE_PATH } from "@/lib/constants/storage";
import type { CardStorageLocationSectionProps } from "@/lib/interfaces/storage";
import { IconBox, IconBoxOff } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
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
  const { removeCard, isRemoving } = useRemoveCardFromLocation();
  const [confirmOpen, setConfirmOpen] = useState(false);
  if (!location) return null;

  return (
    <DetailSection title={t("cardLocation.heading")}>
      <div className="flex items-center justify-between gap-2">
        <Link
          to={`${STORAGE_PATH}?location=${location.guid}`}
          className="flex min-w-0 items-center gap-2 rounded-sm text-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <IconBox className="size-4 shrink-0 text-foreground/70" />
          <span className="truncate">
            {t("cardLocation.value", {
              name: location.name,
              position: location.position,
            })}
          </span>
        </Link>
        <Button
          variant="outline-destructive"
          size="sm"
          className="shrink-0"
          disabled={isRemoving}
          onClick={() => setConfirmOpen(true)}
        >
          <IconBoxOff />
          {t("cardLocation.remove")}
        </Button>
      </div>
      <DeleteDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t("removeDialog.title", {
          name: t("removeDialog.thisCard"),
          location: location.name,
        })}
        description={t("removeDialog.description")}
        confirmLabel={t("removeDialog.confirm")}
        onConfirm={() => {
          setConfirmOpen(false);
          void removeCard(location.guid, scanId);
        }}
      />
    </DetailSection>
  );
}
