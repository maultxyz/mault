import { useStoragePlan } from "@/features/bins/api/use-storage-plan";
import { AddStorageLocationsDialog } from "@/features/bins/components/add-storage-locations-dialog";
import { StorageLocationNameDialog } from "@/features/storage/components/storage-location-name-dialog";
import { StorageLocationSeriesDialog } from "@/features/storage/components/storage-location-series-dialog";
import type { StoragePlanDialogsProps } from "@/lib/interfaces/bins";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

export function StoragePlanDialogs({ dialogs }: StoragePlanDialogsProps) {
  const { t } = useTranslation("storage");
  const plan = useStoragePlan();
  const editing = dialogs.editingLocation;
  const editValues = useMemo(
    () => ({
      name: editing?.name ?? "",
      capacity: editing?.capacity ?? null,
      batchSize: editing?.batchSize ?? null,
    }),
    [editing?.name, editing?.capacity, editing?.batchSize],
  );
  return (
    <>
      <AddStorageLocationsDialog
        open={dialogs.addOpen}
        onOpenChange={dialogs.setAddOpen}
        locations={plan.availableLocations}
        onAdd={plan.add}
      />
      <StorageLocationSeriesDialog
        open={dialogs.seriesOpen}
        onOpenChange={dialogs.setSeriesOpen}
        createSeries={plan.createSeries}
      />
      <StorageLocationNameDialog
        open={editing != null}
        onOpenChange={(open) => {
          if (!open) dialogs.setEditingLocation(null);
        }}
        initialValues={editValues}
        title={t("page.rename")}
        submitLabel={t("nameDialog.save")}
        onSubmit={(values) =>
          editing ? plan.updateLocation(editing.guid, values) : Promise.resolve(false)
        }
      />
    </>
  );
}
