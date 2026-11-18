import { DeleteDialog } from "@/components/delete-dialog";
import { Button } from "@/components/ui/button";
import { useStorageLocationBulkActions } from "@/features/storage/api/use-storage-location-bulk-actions";
import { StorageLocationBulkSizesDialog } from "@/features/storage/components/storage-location-bulk-sizes-dialog";
import { StoragePlanMembershipDialog } from "@/features/storage/components/storage-plan-membership-dialog";
import { StoragePlanDeleteWarning } from "@/features/storage/components/storage-plan-delete-warning";
import {
  COLLECTION_SELECTION_ISLAND_BUTTON_CLASS,
  COLLECTION_SELECTION_ISLAND_CLASS,
} from "@/lib/constants/collections";
import { storageLabelsPath } from "@/lib/constants/storage";
import type {
  StorageLocationSelectionBarProps,
  StoragePlanMembershipAction,
} from "@/lib/interfaces/storage";
import { cn } from "@/lib/utils";
import {
  IconPlaylistAdd,
  IconPlaylistX,
  IconPrinter,
  IconRuler2,
  IconTrash,
} from "@tabler/icons-react";
import { useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export function StorageLocationSelectionBar({
  selection,
  showsPrintLabels,
}: StorageLocationSelectionBarProps) {
  const { t } = useTranslation("storage");
  const bulkActions = useStorageLocationBulkActions();
  const [sizesOpen, setSizesOpen] = useState(false);
  const [planAction, setPlanAction] =
    useState<StoragePlanMembershipAction | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const locations = selection.checkedLocations;
  const count = locations.length;
  const guids = locations.map((location) => location.guid);

  const deleteSelected = async () => {
    if (await bulkActions.deleteLocations(guids)) selection.clear();
  };

  if (count === 0) return null;

  return (
    <>
      {createPortal(
        <div className={cn(COLLECTION_SELECTION_ISLAND_CLASS, "max-w-[calc(100vw-2rem)] flex-wrap")}>
          <span role="status" className="font-medium">
            {t("bulk.selected", { count })}
          </span>
          <div className="flex flex-wrap gap-1.5">
            <Button
              variant="ghost"
              className={COLLECTION_SELECTION_ISLAND_BUTTON_CLASS}
              onClick={selection.toggleAllVisible}
            >
              {selection.allVisibleChecked
                ? t("bulk.deselectAll")
                : t("bulk.selectAll")}
            </Button>
            <Button
              variant="ghost"
              className={COLLECTION_SELECTION_ISLAND_BUTTON_CLASS}
              onClick={selection.clear}
            >
              {t("bulk.clear")}
            </Button>
            <Button
              variant="ghost"
              className={COLLECTION_SELECTION_ISLAND_BUTTON_CLASS}
              disabled={bulkActions.isRunning}
              onClick={() => setSizesOpen(true)}
            >
              <IconRuler2 />
              {t("bulk.setSizes")}
            </Button>
            <Button
              variant="ghost"
              className={COLLECTION_SELECTION_ISLAND_BUTTON_CLASS}
              disabled={bulkActions.isRunning}
              onClick={() => setPlanAction("add")}
            >
              <IconPlaylistAdd />
              {t("bulk.addToPlan")}
            </Button>
            <Button
              variant="ghost"
              className={COLLECTION_SELECTION_ISLAND_BUTTON_CLASS}
              disabled={bulkActions.isRunning}
              onClick={() => setPlanAction("remove")}
            >
              <IconPlaylistX />
              {t("bulk.removeFromPlan")}
            </Button>
            {showsPrintLabels && (
              <Button
                variant="ghost"
                className={cn(
                  COLLECTION_SELECTION_ISLAND_BUTTON_CLASS,
                  "max-md:hidden",
                )}
                nativeButton={false}
                render={<Link to={storageLabelsPath(guids)} />}
              >
                <IconPrinter />
                {t("bulk.printLabels")}
              </Button>
            )}
            <Button
              variant="destructive"
              disabled={bulkActions.isRunning}
              onClick={() => setDeleteOpen(true)}
            >
              <IconTrash />
              {t("bulk.delete")}
            </Button>
          </div>
        </div>,
        document.body,
      )}
      <StorageLocationBulkSizesDialog
        open={sizesOpen}
        onOpenChange={setSizesOpen}
        count={count}
        onSubmit={(input) =>
          bulkActions.updateSizes({ locationGuids: guids, ...input })
        }
      />
      <StoragePlanMembershipDialog
        open={planAction !== null}
        onOpenChange={(open) => {
          if (!open) setPlanAction(null);
        }}
        action={planAction ?? "add"}
        count={count}
        onSubmit={(presetGuid) =>
          bulkActions.changePlanMembership(
            presetGuid,
            locations,
            planAction ?? "add",
          )
        }
      />
      <DeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t("bulk.deleteTitle", { count })}
        description={t("bulk.deleteDescription", { count })}
        confirm={count > 10 ? { type: "keyword" } : { type: "simple" }}
        onConfirm={() => void deleteSelected()}
      >
        {deleteOpen && <StoragePlanDeleteWarning locations={locations} />}
      </DeleteDialog>
    </>
  );
}
