import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LocationMoveFields } from "@/features/storage/components/location-move-fields";
import { useLocationMoveForm } from "@/features/storage/lib/use-location-move-form";
import type { ExportedCardsDialogProps } from "@/lib/interfaces/cards";
import { IconBox, IconLoader2, IconTrash } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function ExportedCardsDialog({
  open,
  count,
  isMoving,
  onOpenChange,
  onMove,
  onDelete,
}: ExportedCardsDialogProps) {
  const { t } = useTranslation("cards");
  const { form, locations, submit, isCreating } = useLocationMoveForm({
    open,
    onMove,
    onMoved: () => onOpenChange(false),
  });
  const isBusy = isMoving || isCreating;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("exportedDialog.title", { count })}</DialogTitle>
          <DialogDescription>
            {t("exportedDialog.description", { count })}
          </DialogDescription>
        </DialogHeader>
        <form
          id="exported-cards-form"
          onSubmit={submit}
          className="flex flex-col gap-4"
        >
          <LocationMoveFields
            form={form}
            locations={locations}
            idPrefix="exported-cards"
          />
        </form>
        <DialogFooter className="sm:justify-between">
          <Button
            variant="outline-destructive"
            disabled={isBusy}
            onClick={onDelete}
          >
            <IconTrash />
            {t("exportedDialog.delete", { count })}
          </Button>
          <div className="flex flex-col-reverse gap-1.5 sm:flex-row">
            <Button
              variant="outline"
              disabled={isBusy}
              onClick={() => onOpenChange(false)}
            >
              {t("cardGrid.exportedKeep")}
            </Button>
            <Button type="submit" form="exported-cards-form" disabled={isBusy}>
              {isBusy ? <IconLoader2 className="animate-spin" /> : <IconBox />}
              {t("exportedDialog.move")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
