import { binsQueryOptions } from "@/features/bins/api/sort-bins";
import {
  locationGuidsInAnyPlan,
  presetNamesUsingLocations,
  storagePlanCountsByLocation,
} from "@/features/storage/lib/storage-plan-uses";
import { presetsUsingStorageLocation } from "@magic-vault/shared";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

export function useStorageLocationPresetUses(locationGuid: string) {
  const { data: presets = [], isPending } = useQuery(binsQueryOptions);
  const uses = useMemo(
    () => presetsUsingStorageLocation(presets, locationGuid),
    [presets, locationGuid],
  );
  return { uses, isPending };
}

export function useStoragePlanCounts() {
  const { data: presets = [] } = useQuery(binsQueryOptions);
  return useMemo(() => storagePlanCountsByLocation(presets), [presets]);
}

export function useStoragePlanDeleteImpact(locationGuids: string[]) {
  const { data: presets = [] } = useQuery(binsQueryOptions);
  return useMemo(
    () => ({
      locationGuids: locationGuidsInAnyPlan(presets, locationGuids),
      presetNames: presetNamesUsingLocations(presets, locationGuids),
    }),
    [presets, locationGuids],
  );
}
