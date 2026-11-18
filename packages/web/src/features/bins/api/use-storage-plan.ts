import { binsQueryOptions } from "@/features/bins/api/sort-bins";
import { useBinConfigs } from "@/features/bins/api/use-bin-configs";
import { useStorageAccess } from "@/features/storage/api/use-storage-access";
import { useStorageLocations } from "@/features/storage/api/use-storage-locations";
import type { StoragePlanDialogsState } from "@/lib/interfaces/bins";
import {
  PRESET_FILL_STORAGE_LOCATIONS_MAX,
  buildStoragePlanRows,
  moveStoragePlanLocation,
  storagePlanBinClaims,
  summarizeStoragePlan,
  type StorageLocation,
  type StorageLocationSeriesInput,
  type StorageLocationSettingsInput,
} from "@magic-vault/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

export function useStoragePlan() {
  const queryClient = useQueryClient();
  const {
    configs,
    selectedSet,
    effectiveMode,
    stageMode,
    isPresetMutating,
    isSavingMode,
  } = useBinConfigs();
  const { locations, isLoading, update, createSeries } = useStorageLocations();
  const { isLocked } = useStorageAccess();
  const locationGuids = effectiveMode.fillStorageLocationGuids;
  const rows = buildStoragePlanRows(locationGuids, locations, configs);

  const setLocationGuids = (next: string[]) =>
    stageMode({
      fillStorageLocationGuids: next.slice(0, PRESET_FILL_STORAGE_LOCATIONS_MAX),
    });
  const add = (guids: string[]) =>
    setLocationGuids([
      ...locationGuids,
      ...guids.filter((guid) => !locationGuids.includes(guid)),
    ]);
  const refreshClaims = () =>
    void queryClient.invalidateQueries({ queryKey: binsQueryOptions.queryKey });

  return {
    hasPreset: !!selectedSet,
    rows,
    claims: storagePlanBinClaims(configs),
    summary: summarizeStoragePlan(rows),
    availableLocations: locations.filter(
      (location) => !locationGuids.includes(location.guid),
    ),
    isFull: locationGuids.length >= PRESET_FILL_STORAGE_LOCATIONS_MAX,
    isLocked,
    isLoading,
    disabled: isPresetMutating || isSavingMode,
    add,
    move: (guid: string, offset: number) => {
      const listedGuids = rows.map((row) => row.location.guid);
      setLocationGuids(
        moveStoragePlanLocation(listedGuids, listedGuids.indexOf(guid), offset),
      );
    },
    remove: (guid: string) =>
      setLocationGuids(locationGuids.filter((current) => current !== guid)),
    updateLocation: async (guid: string, input: StorageLocationSettingsInput) => {
      const updated = await update(guid, input);
      if (updated) refreshClaims();
      return updated;
    },
    createSeries: async (input: StorageLocationSeriesInput) => {
      const result = await createSeries(input);
      if (result) add(result.created.map((location) => location.guid));
      return result;
    },
  };
}

export function useStoragePlanDialogs(): StoragePlanDialogsState {
  const [addOpen, setAddOpen] = useState(false);
  const [seriesOpen, setSeriesOpen] = useState(false);
  const [editingLocation, setEditingLocation] =
    useState<StorageLocation | null>(null);
  return {
    addOpen,
    setAddOpen,
    seriesOpen,
    setSeriesOpen,
    editingLocation,
    setEditingLocation,
  };
}
