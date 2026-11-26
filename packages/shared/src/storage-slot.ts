import type { ClaimedStorageLocation } from "./interfaces/sort-bins.interface";
import type {
  BinStackItem,
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

export function planBinStackSlots(
  newestFirstStack: BinStackItem[],
  usedSlots: number,
  batchSize: number | null | undefined,
): number[] {
  let position = usedSlots;
  let closesBatch = false;
  return newestFirstStack.map((item) => {
    if (closesBatch && batchSize && batchSize > 0 && position % batchSize !== 0) {
      position = Math.ceil(position / batchSize) * batchSize;
    }
    position += 1;
    closesBatch = item.startsStorageBatch;
    return position;
  });
}

export function binStackLastSlot(
  cardCount: number,
  storageBatchStarts: readonly number[],
  usedSlots: number,
  batchSize: number | null | undefined,
): number {
  const breaks = [...new Set(storageBatchStarts)]
    .filter((index) => index > 0 && index < cardCount)
    .sort((a, b) => b - a);
  let position = usedSlots;
  let segmentTop = cardCount;
  for (const breakIndex of breaks) {
    position += segmentTop - breakIndex;
    if (batchSize && batchSize > 0 && position % batchSize !== 0) {
      position = Math.ceil(position / batchSize) * batchSize;
    }
    segmentTop = breakIndex;
  }
  return position + segmentTop;
}

export function binStorageBatchStarts(
  savedStarts: readonly number[] | undefined,
  cardCount: number,
  awaitsStorageBatchStart: boolean,
): number[] {
  const starts = [...(savedStarts ?? [])];
  if (awaitsStorageBatchStart) starts.push(cardCount);
  return starts;
}

export function claimStorageBatchStart(
  binsAwaitingStorageBatchStart: Set<number>,
  savedStartsByBin: Map<number, number[]>,
  binNumber: number,
  cardCountBeforeCard: number,
): void {
  if (!binsAwaitingStorageBatchStart.delete(binNumber)) return;
  savedStartsByBin.set(binNumber, [
    ...(savedStartsByBin.get(binNumber) ?? []),
    cardCountBeforeCard,
  ]);
}

export function storageLocationBinRoom(
  location: Pick<ClaimedStorageLocation, "capacity" | "remainingSlots" | "batchSize" | "usedSlots">,
  storageBatchStarts: readonly number[],
): number | null {
  const { capacity, remainingSlots } = location;
  if (capacity == null || remainingSlots == null) return remainingSlots;
  if (!location.batchSize || storageBatchStarts.length === 0) return remainingSlots;
  const usedSlots = location.usedSlots ?? capacity - remainingSlots;
  let fits = 0;
  let tooMany = remainingSlots + 1;
  while (tooMany - fits > 1) {
    const cardCount = Math.floor((fits + tooMany) / 2);
    if (binStackLastSlot(cardCount, storageBatchStarts, usedSlots, location.batchSize) <= capacity) {
      fits = cardCount;
    } else {
      tooMany = cardCount;
    }
  }
  return fits;
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
