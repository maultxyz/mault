import type { SourceCard } from "./card.interface";
import type { PickListMatch } from "./pick-list.interface";
import type {
  BinConfig,
  BinRuleGroup,
  BinSet,
  FieldMeta,
} from "./sort-bins.interface";

export type ScanRoutingCard = SourceCard & { name: string };

export interface ScanRoutingBinContent {
  binNumber?: number | null;
  scannedAt: number;
  card: SourceCard;
}

export interface ScanRoutingContext {
  binSet: BinSet | null | undefined;
  configs: BinConfig[];
  fieldDefinitions: FieldMeta[];
  binContents: ScanRoutingBinContent[];
  countCardsInBin: (binNumber: number) => number;
  isBinFull: (binNumber: number) => boolean;
  binRoom: (binNumber: number) => number;
  createRuleId: () => string;
}

export interface AutoAssignTarget {
  binNumber: number;
  rules: BinRuleGroup;
}

export type ScanRoutingPauseReason =
  | "all-chaos-bins-full"
  | "all-packs-complete"
  | "bin-full";

export type ScanRoutingDecision =
  | {
      action: "pause";
      reason: ScanRoutingPauseReason;
      bin: BinConfig | undefined;
    }
  | {
      action: "route";
      bin: BinConfig | undefined;
      isLowMatch: boolean;
      pickListMatch: PickListMatch | null;
      autoAssignTarget: AutoAssignTarget | null;
    };
