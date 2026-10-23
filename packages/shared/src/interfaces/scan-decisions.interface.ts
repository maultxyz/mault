import type { BinConfig, BinRuleGroup } from "./sort-bins.interface";
import type { SourceCard } from "./card.interface";

export interface SearchRank {
  data?: readonly { distance: number }[] | null;
  nearestDistance?: number | null;
  diagnostics?: { reason?: string | null } | null;
}

export interface ScanBinDeps {
  countCopies: (bin: BinConfig) => number;
  countInBin: (bin: BinConfig) => number;
  isBinFull: (bin: BinConfig) => boolean;
  binRoom: (bin: BinConfig) => number;
  cardsInBin: (bin: BinConfig) => SourceCard[];
  newId: () => string;
}

export interface ChosenScanBin {
  bin: BinConfig | undefined;
  autoAssign: { binNumber: number; rules: BinRuleGroup } | null;
  pickListName: string | null;
}

export type ScanHold =
  | { reason: "chaos-full"; binNumbers: number[] }
  | { reason: "repack-complete"; binNumbers: number[] }
  | { reason: "bin-full"; bin: BinConfig };
