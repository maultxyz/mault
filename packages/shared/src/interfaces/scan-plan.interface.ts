import type { BinContentCard } from "./collection-cards.interface";
import type { CardCondition } from "./card-condition.interface";
import type { PlayingCardWithDistance } from "./card.interface";
import type { FoilDetection } from "./foil-detection.interface";
import type {
  ScanRoutingContext,
  ScanRoutingDecision,
} from "./scan-routing.interface";
import type {
  MatchedScanDiagnostics,
  ScannedCard,
  ScanVectorizeSource,
  SortOnlyScanRequest,
  UnmatchedCard,
  UnmatchedScanDiagnostics,
} from "./scanner.interface";

export interface ScanPlanInput {
  scanId: string;
  scannedAt: number;
  capturedImageUrl?: string;
  capturedBackImageUrl?: string;
  vectorizedOn?: ScanVectorizeSource;
  deviceGuid?: string;
}

export interface MatchedScanPlanInput extends ScanPlanInput {
  card: PlayingCardWithDistance;
  alternativeMatches?: PlayingCardWithDistance[];
  sessionFoilType: string | null;
  foilDetection?: FoilDetection | null;
  fallbackFoilTypes: string[];
  gameKey?: string | null;
  isNudgeFoilDetectionEnabled?: boolean;
  isFoilStarDetectionEnabled?: boolean;
  condition?: CardCondition;
  lowConfidenceMatch?: boolean;
  diagnostics?: MatchedScanDiagnostics;
}

export interface UnmatchedScanPlanInput extends ScanPlanInput {
  diagnostics?: UnmatchedScanDiagnostics;
  embedding?: number[] | null;
}

export interface ScanPickListUpdate {
  binGuid: string;
  binNumber: number;
  name: string;
  delta: number;
}

export interface ScanPlannedBinCard {
  scanId?: string;
  binNumber?: number | null;
  scannedAt: number;
  card: object;
  isFoil?: boolean;
  foilType?: string;
  unsaved?: boolean;
  capacityOnly?: boolean;
}

export interface MatchedScanBinCard extends BinContentCard {
  unsaved: boolean;
}

export type MatchedScanPersistence =
  | { kind: "cards"; record: ScannedCard }
  | { kind: "cards/sorted"; record: SortOnlyScanRequest };

export type MatchedScanPlan = ScanRoutingDecision & {
  kind: "matched";
  record: ScannedCard;
  ruleCard: PlayingCardWithDistance;
  persistence: MatchedScanPersistence;
  binContent: MatchedScanBinCard | null;
  pickListUpdate: ScanPickListUpdate | null;
};

export type UnmatchedScanPlan = ScanRoutingDecision & {
  kind: "unmatched";
  record: UnmatchedCard;
  persistence: { kind: "unmatched"; record: UnmatchedCard } | { kind: "none" };
  binContent: ScanPlannedBinCard | null;
};

export type ScanCardPlan = MatchedScanPlan | UnmatchedScanPlan;
export type ScanCompletionPauseReason = "all-packs-complete";
export type ScanPlanContext = ScanRoutingContext;
