import { BATCH_DIVIDERS_MAX } from "@/lib/constants/storage-labels";
import type { BatchDivider, BatchDividerPlan } from "@/lib/interfaces/storage-labels";
import { formatStorageSlot, type StorageLocation } from "@magic-vault/shared";

export function customDividerTexts(customDividerText: string): string[] {
  return customDividerText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function customDividers(customTexts: string[], location: StorageLocation | null): BatchDivider[] {
  return customTexts.map((text, index) => ({
    kind: "custom",
    key: `${location?.guid ?? "custom"}-custom-${index}`,
    text,
    locationName: location?.name ?? null,
  }));
}

function locationBatchDividers(location: StorageLocation): BatchDivider[] {
  const { batchSize, capacity } = location;
  if (!batchSize || batchSize < 1 || !capacity || capacity < 1) return [];
  return Array.from({ length: Math.ceil(capacity / batchSize) }, (_, index) => {
    const batch = index + 1;
    return {
      kind: "batch",
      key: `${location.guid}-${batch}`,
      locationName: location.name,
      batch,
      firstSlot: formatStorageSlot((batch - 1) * batchSize + 1, batchSize),
      lastSlot: formatStorageSlot(Math.min(batch * batchSize, capacity), batchSize),
    };
  });
}

export function planBatchDividers(
  locations: StorageLocation[],
  customDividerText = "",
  maxDividers = BATCH_DIVIDERS_MAX,
): BatchDividerPlan {
  const customTexts = customDividerTexts(customDividerText);
  const skippedLocationNames: string[] = [];
  const allDividers =
    locations.length === 0
      ? customDividers(customTexts, null)
      : locations.flatMap((location) => {
          const batchDividers = locationBatchDividers(location);
          if (batchDividers.length === 0) skippedLocationNames.push(location.name);
          return [...customDividers(customTexts, location), ...batchDividers];
        });
  return {
    dividers: allDividers.slice(0, maxDividers),
    totalDividers: allDividers.length,
    skippedLocationNames,
  };
}
