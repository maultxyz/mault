import { DeleteDialog } from "@/components/delete-dialog";
import { Button } from "@/components/ui/button";
import { DetailSection } from "@/features/cards/components/detail-section";
import { cardStorageLocationQueryOptions } from "@/features/storage/api/storage-locations";
import { useStorageAccess } from "@/features/storage/api/use-storage-access";
import {
  useMoveCardsToLocation,
  useRemoveCardFromLocation,
} from "@/features/storage/api/use-storage-locations";
import { MoveToLocationDialog } from "@/features/storage/components/move-to-location-dialog";
import { STORAGE_PATH } from "@/lib/constants/storage";
import type { CardStorageLocationSectionProps } from "@/lib/interfaces/storage";
import { IconBox, IconBoxOff, IconTransfer } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export function CardStorageLocationSection({
  scanId,
  collectionGuid,
  canEdit = true,
}: CardStorageLocationSectionProps) {
  const { t } = useTranslation("storage");
  const { data: location, isPending } = useQuery(
    cardStorageLocationQueryOptions(collectionGuid, scanId),
  );
  const { isLocked: storageLocked } = useStorageAccess();
  const { removeCard, isRemoving } = useRemoveCardFromLocation();
  const { moveCards, isMoving } = useMoveCardsToLocation();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const canMove = canEdit && !storageLocked;
  if (isPending || (!location && !canMove)) return null;

  return (
    <DetailSection title={t("cardLocation.heading")}>
      <div className="flex items-center justify-between gap-2">
        {location ? (
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
        ) : (
          <span className="flex min-w-0 items-center gap-2 text-sm text-foreground/70">
            <IconBoxOff className="size-4 shrink-0" />
            <span className="truncate">{t("cardLocation.notStored")}</span>
          </span>
        )}
        {canEdit && (
          <div className="flex shrink-0 gap-1.5">
            {canMove && (
              <Button
                variant="outline"
                disabled={isMoving}
                onClick={() => setMoveOpen(true)}
              >
                {location ? <IconTransfer /> : <IconBox />}
                {location ? t("cardLocation.move") : t("cardLocation.store")}
              </Button>
            )}
            {location && (
              <Button
                variant="outline-destructive"
                disabled={isRemoving}
                onClick={() => setConfirmOpen(true)}
              >
                <IconBoxOff />
                {t("cardLocation.remove")}
              </Button>
            )}
          </div>
        )}
      </div>
      {location && (
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
      )}
      <MoveToLocationDialog
        open={moveOpen}
        count={1}
        excludedLocationGuid={location?.guid}
        isMoving={isMoving}
        onOpenChange={setMoveOpen}
        onMove={(locationGuid) =>
          moveCards({ guid: locationGuid, scanIds: [scanId], collectionGuid })
        }
      />
    </DetailSection>
  );
}
