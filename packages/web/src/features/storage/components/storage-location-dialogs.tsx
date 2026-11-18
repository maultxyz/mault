import { DeleteDialog } from "@/components/delete-dialog";
import { ShareStorageLinkDialog } from "@/features/storage/components/share-storage-link-dialog";
import { StorageLocationNameDialog } from "@/features/storage/components/storage-location-name-dialog";
import { StorageLocationSeriesDialog } from "@/features/storage/components/storage-location-series-dialog";
import { StoragePlanDeleteWarning } from "@/features/storage/components/storage-plan-delete-warning";
import type { StorageLocationDialogsProps } from "@/lib/interfaces/storage";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

export function StorageLocationDialogs({
  dialogs,
  selected,
  create,
  update,
  createSeries,
  remove,
  onCreated,
  onSelectedDeleted,
}: StorageLocationDialogsProps) {
  const { t } = useTranslation("storage");
  const actionTarget = dialogs.menuLocation ?? selected;
  const renameInitialValues = useMemo(
    () => ({
      name: actionTarget?.name ?? "",
      capacity: actionTarget?.capacity ?? null,
      batchSize: actionTarget?.batchSize ?? null,
    }),
    [actionTarget?.name, actionTarget?.capacity, actionTarget?.batchSize],
  );
  return (
    <>
      <StorageLocationNameDialog
        open={dialogs.createOpen}
        onOpenChange={dialogs.setCreateOpen}
        title={t("page.newLocation")}
        submitLabel={t("nameDialog.create")}
        onSubmit={async (values) => {
          const guid = await create(values);
          if (guid) onCreated?.(guid);
          return !!guid;
        }}
      />
      <StorageLocationNameDialog
        open={dialogs.renameOpen}
        onOpenChange={dialogs.setRenameOpen}
        initialValues={renameInitialValues}
        title={t("page.rename")}
        submitLabel={t("nameDialog.save")}
        onSubmit={(values) =>
          actionTarget
            ? update(actionTarget.guid, values)
            : Promise.resolve(false)
        }
      />
      <StorageLocationSeriesDialog
        open={dialogs.seriesOpen}
        onOpenChange={dialogs.setSeriesOpen}
        createSeries={createSeries}
      />
      <DeleteDialog
        open={dialogs.deleteOpen}
        onOpenChange={dialogs.setDeleteOpen}
        title={t("page.deleteTitle", { name: actionTarget?.name ?? "" })}
        description={t("page.deleteDescription")}
        confirm={{ type: "name", name: actionTarget?.name ?? "" }}
        onConfirm={async () => {
          dialogs.setDeleteOpen(false);
          if (
            actionTarget &&
            (await remove(actionTarget.guid)) &&
            actionTarget.guid === selected?.guid
          ) {
            onSelectedDeleted();
          }
        }}
      >
        {dialogs.deleteOpen && actionTarget && (
          <StoragePlanDeleteWarning locations={[actionTarget]} />
        )}
      </DeleteDialog>
      {dialogs.menuLocation && (
        <ShareStorageLinkDialog
          locationGuid={dialogs.menuLocation.guid}
          open={dialogs.shareOpen}
          onOpenChange={dialogs.setShareOpen}
        />
      )}
    </>
  );
}
