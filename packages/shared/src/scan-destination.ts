import type { ScanDestination } from "./interfaces/scanner.interface";

export function scanDestinationSortsCards(
  destination: ScanDestination,
  isSorterConnected: boolean,
): boolean {
  return isSorterConnected || destination.kind === "sort";
}

export function scanDestinationStorageLocationGuid(
  destination: ScanDestination,
  isSorterConnected: boolean,
): string | undefined {
  if (scanDestinationSortsCards(destination, isSorterConnected)) return undefined;
  return destination.kind === "storage"
    ? (destination.storageLocationGuid ?? undefined)
    : undefined;
}
