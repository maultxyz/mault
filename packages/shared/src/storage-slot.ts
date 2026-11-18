import type {
  FillLocationCandidate,
  StorageSlotParts,
} from "./interfaces/storage-locations.interface";

export function storageSlotParts(
  position: number,
  batchSize: number | null | undefined,
): StorageSlotParts | null {
  if (!batchSize || batchSize < 1 || position < 1) return null;
  return {
    batch: Math.ceil(position / batchSize),
    cardInBatch: ((position - 1) % batchSize) + 1,
  };
}

export function formatStorageSlot(
  position: number,
  batchSize: number | null | undefined,
): string {
  const parts = storageSlotParts(position, batchSize);
  return parts ? `${parts.batch}-${parts.cardInBatch}` : String(position);
}

export function formatStorageSlotCode(
  locationName: string,
  position: number,
  batchSize: number | null | undefined,
): string {
  return `${locationName}-${formatStorageSlot(position, batchSize)}`;
}

export function storageLocationRemainingSlots(
  location: Pick<FillLocationCandidate, "capacity" | "usedSlots">,
): number | null {
  return location.capacity == null
    ? null
    : Math.max(0, location.capacity - location.usedSlots);
}

export function storageLocationHasRoom(
  location: Pick<FillLocationCandidate, "capacity" | "usedSlots">,
): boolean {
  const remaining = storageLocationRemainingSlots(location);
  return remaining == null || remaining > 0;
}

export function nextFillLocation<T extends FillLocationCandidate>(
  orderedLocations: T[],
  claimedLocationIds: ReadonlySet<number>,
): T | null {
  return (
    orderedLocations.find(
      (location) =>
        !claimedLocationIds.has(location.id) && storageLocationHasRoom(location),
    ) ?? null
  );
}

export function storageLocationSeriesNames(
  prefix: string,
  firstNumber: number,
  count: number,
): string[] {
  const trimmedPrefix = prefix.trim();
  return Array.from(
    { length: count },
    (_, index) => `${trimmedPrefix}${firstNumber + index}`,
  );
}
