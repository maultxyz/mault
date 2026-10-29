import { DeleteDialog } from "@/components/delete-dialog";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useDeleteDevices } from "@/features/calibration/api/use-delete-device";
import { useSorterSelection } from "@/features/scanner/api/use-sorter-selection";
import { useStations } from "@/features/scanner/api/use-stations";
import { ConnectSorterMenuOptions } from "@/features/scanner/components/connect-sorter-menu-options";
import { OfflineDeviceTile } from "@/features/scanner/components/offline-device-tile";
import { useHotkeys } from "@/hooks/use-hotkeys";
import {
  COLLECTION_SELECTION_ISLAND_BUTTON_CLASS,
  COLLECTION_SELECTION_ISLAND_CLASS,
  COLLECTIONS_SKELETON_COUNT,
} from "@/lib/constants/collections";
import { SORTERS_GRID_CLASS } from "@/lib/constants/scanner";
import type { StationOverviewGridProps } from "@/lib/interfaces/stations";
import {
  IconDevices,
  IconPlayerPause,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import { useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

export function StationOverviewGrid({
  overview,
  isSearching,
}: StationOverviewGridProps) {
  const { t } = useTranslation("scanner");
  const { attachOverview, getOverviewTileElement } = useStations();
  const {
    selectedKeys,
    runningKeys,
    setSelected,
    clearSelected,
    pauseSorters,
  } = useSorterSelection();
  const deleteDevices = useDeleteDevices();
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const {
    isLoading,
    connectedSorters,
    offlineDevices,
    matchingConnectedSorters,
    matchingOfflineDevices,
    totalCount,
  } = overview;

  const allKeys = [
    ...connectedSorters.map((sorter) => sorter.selectionKey),
    ...offlineDevices.map((device) => device.guid),
  ];
  const visibleKeys = [
    ...matchingConnectedSorters.map((sorter) => sorter.selectionKey),
    ...matchingOfflineDevices.map((device) => device.guid),
  ];
  const selected = allKeys.filter((key) => selectedKeys.has(key));
  const allVisibleSelected =
    visibleKeys.length > 0 && visibleKeys.every((key) => selectedKeys.has(key));
  const selectedRunning = selected.filter((key) => runningKeys.has(key));
  const selectedOffline = offlineDevices.filter((device) =>
    selectedKeys.has(device.guid),
  );

  useLayoutEffect(() => attachOverview(), [attachOverview]);
  useEffect(() => clearSelected, [clearSelected]);
  useHotkeys({
    clearSelection: selected.length > 0 ? clearSelected : undefined,
  });

  if (isLoading) {
    return (
      <div className={SORTERS_GRID_CLASS}>
        {Array.from({ length: COLLECTIONS_SKELETON_COUNT }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-lg border">
            <Skeleton className="aspect-[3/4] rounded-none" />
            <div className="space-y-1.5 border-t p-3">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-2.5 w-20" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (totalCount === 0) {
    return (
      <EmptyState
        icon={IconDevices}
        title={t("stations.overview.emptyTitle")}
        description={t("stations.overview.emptyDescription")}
      />
    );
  }

  if (visibleKeys.length === 0) {
    return (
      <EmptyState
        icon={IconDevices}
        title={t("stations.overview.noSearchResultsTitle")}
        description={t("stations.overview.noSearchResultsDescription")}
      />
    );
  }

  return (
    <>
      <div className={SORTERS_GRID_CLASS}>
        {matchingConnectedSorters.map(({ station }) => (
          <div
            key={station.id}
            className="flex flex-col"
            ref={(node) => {
              const el = getOverviewTileElement(station.id);
              if (node && el.parentNode !== node) node.appendChild(el);
            }}
          />
        ))}
        {matchingOfflineDevices.map((device) => (
          <OfflineDeviceTile key={device.guid} device={device} />
        ))}
        {!isSearching && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  className="flex min-h-56 flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-sm text-foreground/70 transition-colors hover:border-primary/50 hover:bg-primary/5 hover:text-foreground aria-expanded:border-primary/50 aria-expanded:bg-primary/5 motion-reduce:transition-none"
                />
              }
            >
              <span className="rounded-full border border-dashed p-3">
                <IconPlus className="size-5" />
              </span>
              {t("stations.connect")}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center">
              <ConnectSorterMenuOptions />
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      {selected.length > 0 &&
        createPortal(
          <div role="status" className={COLLECTION_SELECTION_ISLAND_CLASS}>
            <span className="font-medium">
              {t("stations.overview.selected", { count: selected.length })}
            </span>
            <div className="flex gap-1.5">
              <Button
                variant="ghost"
                className={COLLECTION_SELECTION_ISLAND_BUTTON_CLASS}
                onClick={() =>
                  setSelected(
                    allVisibleSelected
                      ? selected.filter((key) => !visibleKeys.includes(key))
                      : [...new Set([...selected, ...visibleKeys])],
                  )
                }
              >
                {allVisibleSelected
                  ? t("stations.overview.deselectAll")
                  : t("stations.overview.selectAll")}
              </Button>
              <Button
                variant="ghost"
                className={COLLECTION_SELECTION_ISLAND_BUTTON_CLASS}
                onClick={clearSelected}
              >
                {t("stations.overview.clearSelection")}
              </Button>
              <Button
                variant="ghost"
                className={COLLECTION_SELECTION_ISLAND_BUTTON_CLASS}
                disabled={selectedRunning.length === 0}
                onClick={() => pauseSorters(selectedRunning)}
              >
                <IconPlayerPause />
                {t("stations.overview.pauseSelected", {
                  count: selectedRunning.length,
                })}
              </Button>
              <Button
                variant="destructive"
                className="bg-destructive text-white hover:bg-destructive/90 dark:bg-destructive dark:hover:bg-destructive/90"
                disabled={
                  selectedOffline.length === 0 || deleteDevices.isPending
                }
                title={
                  selectedOffline.length < selected.length
                    ? t("stations.overview.deleteSkipsConnected")
                    : undefined
                }
                onClick={() => setConfirmDeleteOpen(true)}
              >
                <IconTrash />
                {t("stations.overview.deleteSelected", {
                  count: selectedOffline.length,
                })}
              </Button>
            </div>
          </div>,
          document.body,
        )}
      <DeleteDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title={t("stations.overview.bulkDeleteConfirm.title", {
          count: selectedOffline.length,
        })}
        description={t("stations.overview.deleteConfirm.description")}
        confirm={{ type: "keyword" }}
        onConfirm={() => {
          setConfirmDeleteOpen(false);
          deleteDevices.mutate(selectedOffline);
          setSelected(
            selected.filter(
              (key) => !selectedOffline.some((device) => device.guid === key),
            ),
          );
        }}
      />
    </>
  );
}
