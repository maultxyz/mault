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
import type { MoveToLocationDialogProps } from "@/lib/interfaces/storage";
import { IconBox, IconLoader2 } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function MoveToLocationDialog({
  open,
  count,
  excludedLocationGuid,
  isMoving,
  onOpenChange,
  onMove,
}: MoveToLocationDialogProps) {
  const { t } = useTranslation("storage");
  const { form, locations, submit, isCreating } = useLocationMoveForm({
    open,
    excludedLocationGuid,
    onMove,
    onMoved: () => onOpenChange(false),
  });
  const isBusy = isMoving || isCreating;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("moveDialog.title", { count })}</DialogTitle>
          <DialogDescription>
            {t("moveDialog.description", { count })}
          </DialogDescription>
        </DialogHeader>
        <form
          id="move-to-location-form"
          onSubmit={submit}
          className="flex flex-col gap-4"
        >
          <LocationMoveFields
            form={form}
            locations={locations}
            idPrefix="move-to-location"
          />
        </form>
        <DialogFooter>
          <Button
            variant="outline"
            disabled={isBusy}
            onClick={() => onOpenChange(false)}
          >
            {t("moveDialog.cancel")}
          </Button>
          <Button type="submit" form="move-to-location-form" disabled={isBusy}>
            {isBusy ? <IconLoader2 className="animate-spin" /> : <IconBox />}
            {t("moveDialog.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
