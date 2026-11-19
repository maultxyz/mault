import { DeleteDialog } from "@/components/delete-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCollections } from "@/features/collections/api/use-collections";
import { EditCollectionDialog } from "@/features/collections/components/edit-collection-dialog";
import { EmptyCollectionDialog } from "@/features/collections/components/empty-collection-dialog";
import { LIBRARY_PATH, MOBILE_ICON_BUTTON_CLASS } from "@/lib/constants/nav";
import type {
  CollectionTarget,
  MobileCollectionActionsMenuProps,
} from "@/lib/interfaces/collections";
import type { Collection } from "@magic-vault/shared";
import { IconDots, IconEdit, IconEraser, IconTrash } from "@tabler/icons-react";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

export function MobileCollectionActionsMenu({
  collectionGuid,
}: MobileCollectionActionsMenuProps) {
  const { t } = useTranslation("collections");
  const navigate = useNavigate();
  const { collections, isMutating, deleteCollection, emptyCollection } =
    useCollections();
  const collection = collections.find(
    (candidate) => candidate.guid === collectionGuid,
  );
  const [editTarget, setEditTarget] = useState<Collection | null>(null);
  const [emptyChoiceTarget, setEmptyChoiceTarget] =
    useState<CollectionTarget | null>(null);
  const [emptyTarget, setEmptyTarget] = useState<CollectionTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CollectionTarget | null>(
    null,
  );

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    const deleted = await deleteCollection(deleteTarget.guid);
    setDeleteTarget(null);
    if (deleted) navigate(LIBRARY_PATH, { replace: true });
  }, [deleteTarget, deleteCollection, navigate]);

  const handleEmpty = useCallback(async () => {
    if (!emptyTarget) return;
    await emptyCollection(emptyTarget.guid);
    setEmptyTarget(null);
  }, [emptyTarget, emptyCollection]);

  const target = collection
    ? { guid: collection.guid, name: collection.name }
    : null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="outline"
              size="icon"
              className={MOBILE_ICON_BUTTON_CLASS}
              aria-label={t("page.actions", { name: collection?.name ?? "" })}
              disabled={!collection || isMutating}
            />
          }
        >
          <IconDots />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuItem onClick={() => setEditTarget(collection ?? null)}>
            <IconEdit />
            {t("page.edit")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setEmptyChoiceTarget(target)}>
            <IconEraser />
            {t("emptyCollection")}
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setDeleteTarget(target)}
          >
            <IconTrash />
            {t("deleteCollection")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <EditCollectionDialog
        collection={editTarget}
        onClose={() => setEditTarget(null)}
      />
      <EmptyCollectionDialog
        targets={emptyChoiceTarget ? [emptyChoiceTarget] : []}
        onOpenChange={(open) => {
          if (!open) setEmptyChoiceTarget(null);
        }}
        onChooseDelete={() => {
          setEmptyTarget(emptyChoiceTarget);
          setEmptyChoiceTarget(null);
        }}
      />
      <DeleteDialog
        open={!!emptyTarget}
        onOpenChange={(open) => {
          if (!open) setEmptyTarget(null);
        }}
        title={t("emptyCollection")}
        description={t("emptyDialog.description", {
          name: emptyTarget?.name ?? "",
        })}
        confirm={{ type: "name", name: emptyTarget?.name ?? "" }}
        confirmLabel={t("emptyDialog.confirmLabel")}
        onConfirm={handleEmpty}
      />
      <DeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={t("deleteCollection")}
        description={t("deleteDialog.description", {
          name: deleteTarget?.name ?? "",
        })}
        confirm={{ type: "name", name: deleteTarget?.name ?? "" }}
        onConfirm={handleDelete}
      />
    </>
  );
}
