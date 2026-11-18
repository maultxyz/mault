import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import { presetsUsingStorageLocation } from "@magic-vault/shared";
import { binSetsQueryOptions } from "@/features/devices/api/devices";
import { useActiveOrgId } from "@/hooks/use-org";

export function useStoragePlanUses() {
  const orgId = useActiveOrgId();
  const { data: presets, isPending } = useQuery(binSetsQueryOptions(orgId));
  const usesOf = useCallback(
    (locationGuid: string) => presetsUsingStorageLocation(presets ?? [], locationGuid),
    [presets],
  );
  const presetNamesUsing = useCallback(
    (locationGuids: string[]) => [
      ...new Set(locationGuids.flatMap((guid) => usesOf(guid).map((use) => use.presetName))),
    ],
    [usesOf],
  );
  return { usesOf, presetNamesUsing, isPending };
}
