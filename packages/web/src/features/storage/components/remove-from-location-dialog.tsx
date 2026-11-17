import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { RemoveFromLocationDialogProps } from "@/lib/interfaces/storage";
import { useRef } from "react";
import { useTranslation } from "react-i18next";

export function RemoveFromLocationDialog({
  open,
  onOpenChange,
  cardName,
  locationName,
  collectionName,
  focusConfirm,
  onConfirm,
}: RemoveFromLocationDialogProps) {
  const { t } = useTranslation("storage");
  const { t: tCommon } = useTranslation("common");
  const removeFromLocationRef = useRef<HTMLButtonElement>(null);

  const confirm = (alsoRemoveFromCollection: boolean) => {
    onConfirm(alsoRemoveFromCollection);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        initialFocus={focusConfirm ? removeFromLocationRef : undefined}
      >
        <DialogHeader>
          <DialogTitle>
            {t("removeDialog.title", {
              name: cardName,
              location: locationName,
            })}
          </DialogTitle>
          <DialogDescription>
            {t("removeDialog.choiceDescription", {
              collection: collectionName,
            })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tCommon("actions.cancel")}
          </Button>
          <Button
            ref={removeFromLocationRef}
            variant="outline-destructive"
            onClick={() => confirm(false)}
          >
            {t("removeDialog.removeFromLocation")}
          </Button>
          <Button variant="destructive" onClick={() => confirm(true)}>
            {t("removeDialog.removeFromLocationAndCollection")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
