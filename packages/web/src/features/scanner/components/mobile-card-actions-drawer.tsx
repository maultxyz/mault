import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useCardActions } from "@/features/cards/api/use-card-actions";
import type {
  MobileCardActionsBodyProps,
  MobileCardActionsDrawerProps,
} from "@/lib/interfaces/scanner";
import {
  IconCheck,
  IconCopy,
  IconExternalLink,
  IconTrash,
} from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

function MobileCardActionsBody({
  entry,
  onOpenDetails,
  onClose,
}: MobileCardActionsBodyProps) {
  const { t } = useTranslation("cards");
  const {
    canConfirm,
    currentFoil,
    foilOptions,
    confirm,
    setFoil,
    copyName,
    remove,
  } = useCardActions(entry);
  const run = (action: () => void) => () => {
    action();
    onClose();
  };
  const actionClass = "h-11 w-full justify-start gap-3 text-sm";

  return (
    <div
      className="flex flex-col gap-4 overflow-y-auto px-4 pt-2 pb-[calc(1rem+env(safe-area-inset-bottom))]"
    >
      <div className="flex items-center gap-3">
        <div className="aspect-[2.5/3.5] w-12 shrink-0 overflow-hidden rounded-md border bg-muted">
          {entry.card.image?.small && (
            <img
              src={entry.card.image.small}
              alt=""
              className="h-full w-full object-cover"
            />
          )}
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
        <Button
          variant="ghost"
          className={actionClass}
          onClick={run(onOpenDetails)}
        >
          <IconExternalLink className="size-5" />
          {t("cardContextMenu.open")}
        </Button>
        {canConfirm && (
          <Button
            variant="ghost"
            className={actionClass}
            onClick={run(confirm)}
          >
            <IconCheck className="size-5" />
            {t("cardContextMenu.markCorrect")}
          </Button>
        )}
        <Button
          variant="ghost"
          className={actionClass}
          onClick={run(() => void copyName())}
        >
          <IconCopy className="size-5" />
          {t("cardContextMenu.copyName")}
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-foreground/70">
          {t("cardContextMenu.foil")}
        </p>
        <div className="flex flex-wrap gap-2">
          {[null, ...foilOptions].map((option) => (
            <Button
              key={option ?? "none"}
              variant={currentFoil === option ? "outline-selected" : "outline"}
              onClick={run(() => setFoil(option))}
            >
              {option ?? t("cardContextMenu.nonFoil")}
            </Button>
          ))}
        </div>
      </div>

      <Button
        variant="destructive"
        className="h-11 w-full text-sm"
        onClick={run(remove)}
      >
        <IconTrash className="size-5" />
        {t("cardContextMenu.remove", { count: entry.scanIds.length })}
      </Button>
    </div>
  );
}

export function MobileCardActionsDrawer({
  entry,
  onOpenDetails,
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
            onOpenDetails={() => onOpenDetails(shownEntry.scanId)}
            onClose={onClose}
          />
        )}
      </DrawerContent>
    </Drawer>
  );
}
