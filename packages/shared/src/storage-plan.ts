import type { BinConfig, BinSet } from "./interfaces/sort-bins.interface";
import type { StorageLocation } from "./interfaces/storage-locations.interface";
import type {
  StorageLocationPresetUse,
  StoragePlanBinClaim,
  StoragePlanRow,
  StoragePlanSummary,
} from "./interfaces/storage-plan.interface";
import { storageLocationRemainingSlots } from "./storage-slot";

export function buildStoragePlanRows(
  locationGuids: string[],
  locations: StorageLocation[],
  bins: Pick<BinConfig, "binNumber" | "claimedStorageLocation">[],
): StoragePlanRow[] {
  const locationByGuid = new Map(locations.map((location) => [location.guid, location]));
  const binByLocationGuid = new Map(
    bins.flatMap((bin) =>
      bin.claimedStorageLocation ? [[bin.claimedStorageLocation.guid, bin.binNumber] as const] : [],
    ),
  );
  const listed = locationGuids.flatMap((guid) => {
    const location = locationByGuid.get(guid);
    return location ? [location] : [];
  });
  return listed.map((location, index): StoragePlanRow => {
    const guid = location.guid;
    const usedSlots = location.usedSlots ?? 0;
    const capacity = location.capacity ?? null;
    const remainingSlots = storageLocationRemainingSlots({ capacity, usedSlots });
    const fillingBinNumber = binByLocationGuid.get(guid) ?? null;
    return {
      location,
      order: index + 1,
      usedSlots,
      capacity,
      remainingSlots,
      fillPercent:
        capacity == null ? null : Math.min(100, Math.round((usedSlots / capacity) * 100)),
      fillingBinNumber,
      status:
        remainingSlots === 0 ? "full" : fillingBinNumber != null ? "filling" : "waiting",
    };
  });
}

export function storagePlanBinClaims(
  bins: Pick<BinConfig, "binNumber" | "isCatchAll" | "isDisabled" | "claimedStorageLocation">[],
): StoragePlanBinClaim[] {
  return bins
    .filter((bin) => !bin.isDisabled && !bin.isCatchAll)
    .sort((left, right) => left.binNumber - right.binNumber)
    .map((bin) => ({
      binNumber: bin.binNumber,
      locationName: bin.claimedStorageLocation?.name ?? null,
      remainingSlots: bin.claimedStorageLocation?.remainingSlots ?? null,
    }));
}

export function summarizeStoragePlan(rows: StoragePlanRow[]): StoragePlanSummary {
  return {
    total: rows.length,
    full: rows.filter((row) => row.status === "full").length,
    firstName: rows[0]?.location.name ?? null,
    lastName: rows.at(-1)?.location.name ?? null,
  };
}

export function moveStoragePlanLocation(
  locationGuids: string[],
  index: number,
  offset: number,
): string[] {
  const target = index + offset;
  if (target < 0 || target >= locationGuids.length) return locationGuids;
  const next = [...locationGuids];
  const [moved] = next.splice(index, 1);
  next.splice(target, 0, moved);
  return next;
}

export function presetsUsingStorageLocation(
  presets: Pick<BinSet, "guid" | "name" | "isActive" | "game" | "bins" | "fillStorageLocationGuids">[],
  locationGuid: string,
): StorageLocationPresetUse[] {
  return presets
    .flatMap((preset) => {
      const planIndex = (preset.fillStorageLocationGuids ?? []).indexOf(locationGuid);
      if (planIndex === -1) return [];
      const fillingBin = preset.bins.find(
        (bin) => bin.claimedStorageLocation?.guid === locationGuid,
      );
      return [
        {
          presetGuid: preset.guid,
          presetName: preset.name,
          gameName: preset.game?.name ?? null,
          isActive: preset.isActive,
          planPosition: planIndex + 1,
          planLength: preset.fillStorageLocationGuids.length,
          fillingBinNumber: fillingBin?.binNumber ?? null,
        },
      ];
    })
    .sort(
      (left, right) =>
        Number(right.isActive) - Number(left.isActive) ||
        left.presetName.localeCompare(right.presetName),
    );
}
