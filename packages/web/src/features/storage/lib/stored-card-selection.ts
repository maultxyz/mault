import type { StorageLocationSearchResult } from "@magic-vault/shared";

export const storedCardKey = (entry: StorageLocationSearchResult) =>
  entry.scanId;

export const storedCardScanIds = (entry: StorageLocationSearchResult) => [
  entry.scanId,
];
