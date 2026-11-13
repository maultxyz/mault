import type { GroupedScannedCard } from "@magic-vault/shared";

export const groupedCardKey = (entry: GroupedScannedCard) => entry.scanId;

export const groupedCardScanIds = (entry: GroupedScannedCard) => entry.scanIds;
