import type { PlayingCardWithDistance } from "./card.interface";
import type { ScannedCard } from "./scanner.interface";

export interface ScanRemovalEntry {
  entryId: string;
  matchedCard: PlayingCardWithDistance;
  copies: ScannedCard[];
  selectedScanId: string | null;
}

export interface CreateScanRemovalEntryOptions {
  entryId: string;
  matchedCard: PlayingCardWithDistance;
  copies: ScannedCard[];
  existingEntries: ScanRemovalEntry[];
}
