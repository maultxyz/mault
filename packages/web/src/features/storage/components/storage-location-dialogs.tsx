import { DeleteDialog } from "@/components/delete-dialog";
import { ShareStorageLinkDialog } from "@/features/storage/components/share-storage-link-dialog";
import { StorageLocationNameDialog } from "@/features/storage/components/storage-location-name-dialog";
import type { StorageLocationDialogsProps } from "@/lib/interfaces/storage";
import { useTranslation } from "react-i18next";

export function StorageLocationDialogs({
  dialogs,
  selected,
  create,
  rename,
  remove,
  onCreated,
  onSelectedDeleted,
}: StorageLocationDialogsProps) {
  const { t } = useTranslation("storage");
  const actionTarget = dialogs.menuLocation ?? selected;
  return (
    <>
      <StorageLocationNameDialog
        open={dialogs.createOpen}
        onOpenChange={dialogs.setCreateOpen}
        title={t("page.newLocation")}
        submitLabel={t("nameDialog.create")}
        onSubmit={async (name) => {
          const guid = await create(name);
          if (guid) onCreated?.(guid);
          return !!guid;
        }}
      />
      <StorageLocationNameDialog
        open={dialogs.renameOpen}
        onOpenChange={dialogs.setRenameOpen}
        initialName={actionTarget?.name}
        title={t("page.rename")}
        submitLabel={t("nameDialog.save")}
        onSubmit={(name) =>
          actionTarget
            ? rename(actionTarget.guid, name)
            : Promise.resolve(false)
        }
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
      />
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
