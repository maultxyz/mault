import { DeleteDialog } from "@/components/delete-dialog";
import { SelectionActionBar } from "@/components/selection-action-bar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  allExportAdapters,
  downloadStorageLocationCsv,
  supportsGame,
  type ExportAdapter,
} from "@/features/cards/lib/export";
import { collectionsQueryOptions } from "@/features/collections/api/collections";
import { useMarkStorageCardsDownloaded } from "@/features/storage/api/use-mark-storage-cards-downloaded";
import { useStorageAccess } from "@/features/storage/api/use-storage-access";
import { useStoredCardBulkActions } from "@/features/storage/api/use-stored-card-bulk-actions";
import { MoveToLocationDialog } from "@/features/storage/components/move-to-location-dialog";
import {
  SELECTION_ACTION_BAR_BUTTON_CLASS,
  SELECTION_ACTION_BAR_DESTRUCTIVE_BUTTON_CLASS,
} from "@/lib/constants/card-grid";
import { BULK_TAG_ACTIONS } from "@/lib/constants/card-tags";
import type { StorageCardSelectionBarProps } from "@/lib/interfaces/storage";
import { toast } from "@/lib/toast";
import { CARD_CONDITIONS, CARD_TAGS } from "@magic-vault/shared";
import {
  IconBoxOff,
  IconChevronDown,
  IconDownload,
  IconLoader2,
  IconRosette,
  IconSparkles,
  IconTag,
  IconTransfer,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

export function StorageCardSelectionBar({
  location,
  selectedReferences,
  onClear,
}: StorageCardSelectionBarProps) {
  const { t } = useTranslation("cards");
  const { t: tStorage } = useTranslation("storage");
  const { data: collections = [] } = useQuery(collectionsQueryOptions);
  const { isLocked: storageLocked } = useStorageAccess();
  const bulkActions = useStoredCardBulkActions();
  const markCardsDownloaded = useMarkStorageCardsDownloaded(location.guid);
  const [isExporting, setIsExporting] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const selectedCount = selectedReferences.length;
  const selectedScanIds = selectedReferences.map(
    (reference) => reference.scanId,
  );

  const selectedGames = useMemo(() => {
    const selectedCollectionGuids = new Set(
      selectedReferences.map((reference) => reference.collectionGuid),
    );
    const gamesByKey = new Map(
      collections
        .filter((collection) => selectedCollectionGuids.has(collection.guid))
        .flatMap((collection) =>
          collection.game ? [[collection.game.key, collection.game]] : [],
        ),
    );
    return [...gamesByKey.values()];
  }, [collections, selectedReferences]);

  const exportAdapters = useMemo(
    () =>
      allExportAdapters.filter((adapter) =>
        selectedGames.every((game) => supportsGame(adapter, game.key)),
      ),
    [selectedGames],
  );

  const singleGame = selectedGames.length === 1 ? selectedGames[0] : null;
  const foilOptions = singleGame
    ? singleGame.foilTypes.length > 0
      ? singleGame.foilTypes
      : [t("foil")]
    : null;

  const exportSelected = async (adapter: ExportAdapter) => {
    setIsExporting(true);
    try {
      await downloadStorageLocationCsv(location.guid, adapter, location.name, {
        combineDuplicates: true,
        scanIds: selectedScanIds,
      });
      markCardsDownloaded(selectedScanIds);
    } catch (error) {
      console.error("Failed to export selected stored cards:", error);
      toast.error(t("cardGrid.exportSelectedFailed"));
    } finally {
      setIsExporting(false);
    }
  };

  const moveSelected = async (targetLocationGuid: string) => {
    const moved = await bulkActions.moveToLocation(
      selectedReferences,
      targetLocationGuid,
    );
    if (moved) onClear();
    return moved;
  };

  const removeSelectedFromLocation = async () => {
    if (await bulkActions.removeFromLocation(selectedReferences)) onClear();
  };

  const deleteSelected = async () => {
    if (await bulkActions.deleteCards(selectedReferences)) onClear();
  };

  return (
    <>
      <SelectionActionBar selectedCount={selectedCount} onClear={onClear}>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                disabled={isExporting || exportAdapters.length === 0}
                className={SELECTION_ACTION_BAR_BUTTON_CLASS}
              />
            }
          >
            {isExporting ? (
              <IconLoader2 className="animate-spin motion-reduce:animate-none" />
            ) : (
              <IconDownload />
            )}
            {isExporting ? t("cardGrid.exporting") : t("cardGrid.export")}
            <IconChevronDown />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" side="top">
            {exportAdapters.map((adapter) => (
              <DropdownMenuItem
                key={adapter.key}
                onClick={() => void exportSelected(adapter)}
              >
                {adapter.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        {foilOptions && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  disabled={bulkActions.isUpdating}
                  className={SELECTION_ACTION_BAR_BUTTON_CLASS}
                />
              }
            >
              <IconSparkles />
              {t("cardContextMenu.foil")}
              <IconChevronDown />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" side="top">
              <DropdownMenuItem
                onClick={() =>
                  void bulkActions.setFoilType(selectedReferences, null)
                }
              >
                {t("cardContextMenu.nonFoil")}
              </DropdownMenuItem>
              {foilOptions.map((option) => (
                <DropdownMenuItem
                  key={option}
                  onClick={() =>
                    void bulkActions.setFoilType(selectedReferences, option)
                  }
                >
                  {option}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                disabled={bulkActions.isUpdating}
                className={SELECTION_ACTION_BAR_BUTTON_CLASS}
              />
            }
          >
            <IconRosette />
            {t("condition.setSelected")}
            <IconChevronDown />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" side="top">
            {CARD_CONDITIONS.map((option) => (
              <DropdownMenuItem
                key={option}
                onClick={() =>
                  void bulkActions.setCondition(selectedReferences, option)
                }
              >
                {t(`condition.names.${option}`)}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                disabled={bulkActions.isUpdating}
                className={SELECTION_ACTION_BAR_BUTTON_CLASS}
              />
            }
          >
            <IconTag />
            {t("cardTags.title")}
            <IconChevronDown />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" side="top">
            {BULK_TAG_ACTIONS.map(({ enabled, labelKey }, index) => (
              <DropdownMenuGroup key={labelKey}>
                {index > 0 && <DropdownMenuSeparator />}
                <DropdownMenuLabel>{t(labelKey)}</DropdownMenuLabel>
                {CARD_TAGS.map((tag) => (
                  <DropdownMenuItem
                    key={tag}
                    onClick={() =>
                      void bulkActions.setTags(
                        selectedReferences,
                        [tag],
                        enabled,
                      )
                    }
                  >
                    {t(`cardTags.names.${tag}`)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        {!storageLocked && (
          <>
            <Button
              variant="ghost"
              disabled={bulkActions.isUpdating}
              className={SELECTION_ACTION_BAR_BUTTON_CLASS}
              onClick={() => setMoveOpen(true)}
            >
              <IconTransfer />
              {tStorage("cardLocation.move")}
            </Button>
            <Button
              variant="ghost"
              disabled={bulkActions.isUpdating}
              className={SELECTION_ACTION_BAR_BUTTON_CLASS}
              onClick={() => setConfirmRemoveOpen(true)}
            >
              <IconBoxOff />
              {tStorage("cardLocation.remove")}
            </Button>
          </>
        )}
        <Button
          variant="destructive"
          disabled={bulkActions.isUpdating}
          className={SELECTION_ACTION_BAR_DESTRUCTIVE_BUTTON_CLASS}
          onClick={() => setConfirmDeleteOpen(true)}
        >
          {t("cardGrid.delete")}
        </Button>
      </SelectionActionBar>

      <MoveToLocationDialog
        open={moveOpen}
        count={selectedCount}
        excludedLocationGuid={location.guid}
        isMoving={bulkActions.isUpdating}
        onOpenChange={setMoveOpen}
        onMove={moveSelected}
      />

      <DeleteDialog
        open={confirmRemoveOpen}
        onOpenChange={setConfirmRemoveOpen}
        title={tStorage("bulkRemoveDialog.title", {
          count: selectedCount,
          location: location.name,
        })}
        description={tStorage("removeDialog.description")}
        confirmLabel={tStorage("removeDialog.removeFromLocation")}
        onConfirm={() => void removeSelectedFromLocation()}
      />

      <DeleteDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title={t("cardGrid.deleteCardsTitle", { count: selectedCount })}
        description={t("cardGrid.deleteCardsDescription", {
          count: selectedCount,
        })}
        confirm={selectedCount > 100 ? { type: "keyword" } : { type: "simple" }}
        onConfirm={() => void deleteSelected()}
      />
    </>
  );
}
