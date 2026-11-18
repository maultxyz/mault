import type { BinSet } from "@magic-vault/shared";

export function storagePlanCountsByLocation(
  presets: Pick<BinSet, "fillStorageLocationGuids">[],
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const preset of presets) {
    for (const guid of new Set(preset.fillStorageLocationGuids ?? [])) {
      counts.set(guid, (counts.get(guid) ?? 0) + 1);
    }
  }
  return counts;
}

export function presetNamesUsingLocations(
  presets: Pick<BinSet, "name" | "fillStorageLocationGuids">[],
  locationGuids: string[],
): string[] {
  const selected = new Set(locationGuids);
  return presets
    .filter((preset) =>
      (preset.fillStorageLocationGuids ?? []).some((guid) => selected.has(guid)),
    )
    .map((preset) => preset.name)
    .sort((left, right) => left.localeCompare(right));
}

export function locationGuidsInAnyPlan(
  presets: Pick<BinSet, "fillStorageLocationGuids">[],
  locationGuids: string[],
): string[] {
  const counts = storagePlanCountsByLocation(presets);
  return locationGuids.filter((guid) => counts.has(guid));
}
