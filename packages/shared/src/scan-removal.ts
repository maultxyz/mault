import { SCAN_REMOVAL_MAX_CANDIDATES } from "./constants/scan-removal.constant";
import { getCatchAllBin } from "./evaluate-bin";
import type { PlayingCardWithDistance } from "./interfaces/card.interface";
import type {
  CreateScanRemovalEntryOptions,
  ScanRemovalEntry,
} from "./interfaces/scan-removal.interface";
import type { ScannedCard } from "./interfaces/scanner.interface";
import type { BinConfig } from "./interfaces/sort-bins.interface";

export function scanRemovalCandidateCardIds(
  matchedCard: PlayingCardWithDistance,
  alternativeMatches: PlayingCardWithDistance[] = [],
): string[] {
  const candidateIds = [matchedCard, ...alternativeMatches].map((card) => card.id);
  return [...new Set(candidateIds)].slice(0, SCAN_REMOVAL_MAX_CANDIDATES);
}

export function queuedRemovalScanIds(
  entries: ScanRemovalEntry[],
  exceptEntryId?: string,
): Set<string> {
  const scanIds = new Set<string>();
  for (const entry of entries) {
    if (entry.entryId !== exceptEntryId && entry.selectedScanId) {
      scanIds.add(entry.selectedScanId);
    }
  }
  return scanIds;
}

export function createScanRemovalEntry({
  entryId,
  matchedCard,
  copies,
  existingEntries,
}: CreateScanRemovalEntryOptions): ScanRemovalEntry {
  const queuedScanIds = queuedRemovalScanIds(existingEntries);
  const firstAvailableCopy = copies.find(
    (copy) => !queuedScanIds.has(copy.scanId),
  );
  return {
    entryId,
    matchedCard,
    copies,
    selectedScanId: firstAvailableCopy?.scanId ?? null,
  };
}

export function selectableRemovalCopies(
  entry: ScanRemovalEntry,
  entries: ScanRemovalEntry[],
): ScannedCard[] {
  const queuedElsewhere = queuedRemovalScanIds(entries, entry.entryId);
  return entry.copies.filter((copy) => !queuedElsewhere.has(copy.scanId));
}

export function selectedRemovalCopy(
  entry: ScanRemovalEntry,
): ScannedCard | null {
  return entry.copies.find((copy) => copy.scanId === entry.selectedScanId) ?? null;
}

export function scanIdsToRemove(entries: ScanRemovalEntry[]): string[] {
  return [...queuedRemovalScanIds(entries)];
}

export function resolveRemovalBinNumber(
  binConfigs: BinConfig[],
  chosenBinNumber: number | null,
): number | null {
  const chosenBin = binConfigs.find(
    (bin) => bin.binNumber === chosenBinNumber && !bin.isDisabled,
  );
  return chosenBin?.binNumber ?? getCatchAllBin(binConfigs)?.binNumber ?? null;
}
