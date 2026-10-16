import { DeleteDialog } from "@/components/delete-dialog";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { devicesQueryOptions } from "@/features/calibration/api/devices";
import { useDeleteDevices } from "@/features/calibration/api/use-delete-device";
import { useOrg } from "@/features/companies/api/use-organization";
import { useSorterSelection } from "@/features/scanner/api/use-sorter-selection";
import { useStations } from "@/features/scanner/api/use-stations";
import { OfflineDeviceTile } from "@/features/scanner/components/offline-device-tile";
import {
  IconCheckbox,
  IconDevices,
  IconPlayerPause,
  IconTrash,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useLayoutEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export function StationOverviewGrid() {
  const { t } = useTranslation("scanner");
  const { activeOrg } = useOrg();
  const { data: devices = [] } = useQuery(devicesQueryOptions(activeOrg?.id));
  const {
    stations,
    connectedStationIds,
    attachOverview,
    getOverviewTileElement,
  } = useStations();
  const {
    selectedKeys,
    runningKeys,
    setSelected,
    clearSelected,
    pauseSorters,
  } = useSorterSelection();
  const deleteDevices = useDeleteDevices();
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const connected = stations.filter((s) => connectedStationIds.has(s.id));
  const connectedDeviceGuids = new Set(connected.map((s) => s.deviceGuid));
  const offlineDevices = devices.filter(
    (d) => !connectedDeviceGuids.has(d.guid),
  );
  const allKeys = [
    ...connected.map((s) => s.deviceGuid ?? s.id),
    ...offlineDevices.map((d) => d.guid),
  ];
  const selected = allKeys.filter((key) => selectedKeys.has(key));
  const allSelected = allKeys.length > 0 && selected.length === allKeys.length;
  const selectedRunning = selected.filter((key) => runningKeys.has(key));
  const selectedOffline = offlineDevices.filter((d) =>
    selectedKeys.has(d.guid),
  );

  useLayoutEffect(() => attachOverview(), [attachOverview]);
  useEffect(() => clearSelected, [clearSelected]);

  if (connected.length === 0 && offlineDevices.length === 0) {
    return (
      <EmptyState
        icon={IconDevices}
        title={t("stations.overview.emptyTitle")}
        description={t("stations.overview.emptyDescription")}
      />
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => (allSelected ? clearSelected() : setSelected(allKeys))}
        >
          <IconCheckbox />
          {allSelected
            ? t("stations.overview.deselectAll")
            : t("stations.overview.selectAll")}
        </Button>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,16rem),1fr))] gap-3">
        {connected.map((station) => (
          <div
            key={station.id}
            className="flex flex-col"
            ref={(node) => {
              const el = getOverviewTileElement(station.id);
              if (node && el.parentNode !== node) node.appendChild(el);
            }}
          />
        ))}
        {offlineDevices.map((device) => (
          <OfflineDeviceTile key={device.guid} device={device} />
        ))}
      </div>
      {selected.length > 0 && (
        <div
          role="status"
          className="sticky bottom-4 z-50 mx-auto mt-auto flex w-fit shrink-0 items-center gap-3 rounded-lg bg-foreground px-1.5 pl-3 py-1.5 text-xs text-background shadow-2xl ring-1 ring-foreground/20 animate-in fade-in-0 slide-in-from-bottom-4 duration-150 motion-reduce:animate-none"
        >
          <span className="font-medium">
            {t("stations.overview.selected", { count: selected.length })}
          </span>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              className="text-background hover:bg-background/15 hover:text-background dark:hover:bg-background/15"
              onClick={clearSelected}
            >
              {t("stations.overview.clearSelection")}
            </Button>
            <Button
              variant="ghost"
              className="text-background hover:bg-background/15 hover:text-background dark:hover:bg-background/15"
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
              disabled={selectedOffline.length === 0 || deleteDevices.isPending}
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
        </div>
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
              (key) => !selectedOffline.some((d) => d.guid === key),
            ),
          );
        }}
      />
    </div>
  );
}
