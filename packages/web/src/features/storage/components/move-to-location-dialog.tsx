import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useMoveTargetCollections } from "@/features/collections/api/use-move-target-collections";
import { LocationMoveFields } from "@/features/storage/components/location-move-fields";
import { collectionGuidFromMoveTarget } from "@/features/storage/lib/move-target";
import { useLocationMoveForm } from "@/features/storage/lib/use-location-move-form";
import type { MoveToLocationDialogProps } from "@/lib/interfaces/storage";
import { IconBox, IconLoader2 } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function MoveToLocationDialog({
  open,
  count,
  excludedLocationGuid,
  isMoving,
  showLocations = true,
  sourceCollectionGuid,
  onOpenChange,
  onMove,
  onMoveToCollection,
}: MoveToLocationDialogProps) {
  const { t } = useTranslation("storage");
  const targetCollections = useMoveTargetCollections(
    onMoveToCollection ? sourceCollectionGuid : undefined,
  );
  const { form, locations, submit, isCreating } = useLocationMoveForm({
    open,
    excludedLocationGuid,
    showLocations,
    collections: targetCollections,
    onMove,
    onMoveToCollection,
    onMoved: () => onOpenChange(false),
  });
  const isBusy = isMoving || isCreating || form.formState.isSubmitting;
  const hasCollections = targetCollections.length > 0;
  const isCollectionTarget = !!collectionGuidFromMoveTarget(
    form.watch("locationGuid"),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {hasCollections
              ? t("moveDialog.titleAnyTarget", { count })
              : t("moveDialog.title", { count })}
          </DialogTitle>
          <DialogDescription>
            {isCollectionTarget
              ? t("moveDialog.collectionDescription", { count })
              : t("moveDialog.description", { count })}
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
            showLocations={showLocations}
            collections={targetCollections}
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
