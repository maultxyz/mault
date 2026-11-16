import { Button } from "@/components/ui/button";
import { CardImage } from "@/components/card-image";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useCardActions } from "@/features/cards/api/use-card-actions";
import { StorageDeleteWarning } from "@/features/cards/components/storage-delete-warning";
import { MoveToLocationDialog } from "@/features/storage/components/move-to-location-dialog";
import type {
  MobileCardActionsBodyProps,
  MobileCardActionsDrawerProps,
} from "@/lib/interfaces/scanner";
import {
  IconBox,
  IconCheck,
  IconTrash,
} from "@tabler/icons-react";
import { useState } from "react";
import { CARD_CONDITIONS } from "@magic-vault/shared";
import { useTranslation } from "react-i18next";

function MobileCardActionsBody({
  entry,
  onClose,
}: MobileCardActionsBodyProps) {
  const { t } = useTranslation("cards");
  const {
    canConfirm,
    currentFoil,
    foilOptions,
    currentCondition,
    setCondition,
    confirm,
    setFoil,
    remove,
    canMoveToLocation,
    canMove,
    sourceCollectionGuid,
    isMovingToLocation,
    moveToLocation,
    moveToCollection,
  } = useCardActions(entry);
  const [moveToLocationOpen, setMoveToLocationOpen] = useState(false);
  const run = (action: () => void) => () => {
    action();
    onClose();
  };
  const actionClass = "w-full justify-start gap-3";
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const storedCount = entry.storedCount ?? (entry.storageLocation ? 1 : 0);
  const requestRemove = () => {
    if (storedCount > 0 && !confirmingRemove) {
      setConfirmingRemove(true);
      return;
    }
    remove();
    onClose();
  };

  return (
    <div className="flex flex-col gap-4 md:gap-2 overflow-y-auto px-4 pt-2 pb-[calc(1rem+env(safe-area-inset-bottom))]">
      <div className="flex items-center gap-3">
        <div className="aspect-[2.5/3.5] w-12 shrink-0 overflow-hidden rounded-md bg-muted">
          <CardImage src={entry.card.image?.small} alt="" />
        </div>
        <div className="min-w-0">
          <DrawerTitle className="truncate text-base font-semibold">
            {entry.card.name}
          </DrawerTitle>
          <DrawerDescription className="truncate text-xs text-foreground/70">
            {entry.card.set.toUpperCase()} #{entry.card.collectorNumber}
          </DrawerDescription>
        </div>
      </div>

      <div className="flex flex-col">
        {canConfirm && (
          <Button
            variant="ghost"
            size="lg" className={actionClass}
            onClick={run(confirm)}
          >
            <IconCheck />
            {t("cardContextMenu.markCorrect")}
          </Button>
        )}
        {canMove && (
          <Button
            variant="ghost"
            size="lg" className={actionClass}
            onClick={() => setMoveToLocationOpen(true)}
          >
            <IconBox />
            {t("cardContextMenu.moveToLocation")}
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium text-foreground/70">
          {t("cardContextMenu.foil")}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {[null, ...foilOptions].map((option) => (
            <Button
              key={option ?? "none"}
              variant={currentFoil === option ? "outline-selected" : "outline"}
              aria-pressed={currentFoil === option}
              onClick={run(() => setFoil(option))}
            >
              {option ?? t("cardContextMenu.nonFoil")}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium text-foreground/70">
          {t("condition.label")}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {CARD_CONDITIONS.map((option) => (
            <Button
              key={option}
              variant={
                currentCondition === option ? "outline-selected" : "outline"
              }
              aria-pressed={currentCondition === option}
              onClick={run(() => setCondition(option))}
            >
              {option}
            </Button>
          ))}
        </div>
      </div>

      {confirmingRemove && (
        <StorageDeleteWarning
          storedCount={storedCount}
          total={entry.scanIds.length}
          location={entry.storageLocation}
        />
      )}
      <Button
        variant="destructive"
        size="lg"
        className="w-full"
        onClick={requestRemove}
      >
        <IconTrash />
        {confirmingRemove
          ? t("storageDeleteWarning.deleteAnyway")
          : t("cardContextMenu.remove", { count: entry.scanIds.length })}
      </Button>
      <MoveToLocationDialog
        open={moveToLocationOpen}
        count={entry.scanIds.length}
        isMoving={isMovingToLocation}
        onOpenChange={setMoveToLocationOpen}
        showLocations={canMoveToLocation}
        sourceCollectionGuid={sourceCollectionGuid}
        onMove={async (locationGuid) => {
          const moved = await moveToLocation(locationGuid);
          if (moved) onClose();
          return moved;
        }}
        onMoveToCollection={async (collectionGuid) => {
          const moved = await moveToCollection(collectionGuid);
          if (moved) onClose();
          return moved;
        }}
      />
    </div>
  );
}

export function MobileCardActionsDrawer({
  entry,
  onClose,
}: MobileCardActionsDrawerProps) {
  const [shownEntry, setShownEntry] = useState(entry);
  if (entry && entry !== shownEntry) setShownEntry(entry);

  return (
    <Drawer
      open={!!entry}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DrawerContent>
        {shownEntry && (
          <MobileCardActionsBody
            key={shownEntry.scanId}
            entry={shownEntry}
            onClose={onClose}
          />
        )}
      </DrawerContent>
    </Drawer>
  );
}
