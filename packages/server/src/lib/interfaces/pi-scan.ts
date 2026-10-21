import type {
  BinConfig,
  BinRoute,
  BinSet,
  FieldMeta,
  OcrDiagnostics,
  PiScanSessionActivity,
  PiScanSessionPhase,
  PiScanSessionSight,
  PiScanSessionStartBody,
  PiScanSessionStartCode,
  PiScanSessionState,
  ScanDetectionDiagnostics,
  ScanMatchSource,
  ScanRegion,
} from "@magic-vault/shared";
import type { CardMatchSearchResult } from "./card-search";
import type { SorterLink } from "../pi-scan/sorter-link";

export interface PiScanBinCard {
  binNumber?: number | null;
  scannedAt: number;
  card: object;
}

export interface PiScanRunContext {
  collectionId: number;
  collectionName: string;
  gameId: number;
  gameKey: string;
  gameName: string | undefined;
  lang: string;
  deviceGuid: string;
  moduleCount: number;
  region: ScanRegion;
  settleMs: number;
  checkBothOrientations: boolean;
  flipCamera: boolean;
  matchesNeeded: number;
  matchAllLanguages: boolean;
  ocrEnabled: boolean;
  cardThickness: number | null;
  fieldDefinitions: FieldMeta[];
  binSetId: number;
  binSetGuid: string;
  set: BinSet;
  configs: BinConfig[];
  routes: BinRoute[];
  heights: Map<number, number>;
  counts: Map<number, number>;
  contents: PiScanBinCard[];
}

export interface PiScanLive {
  phase: PiScanSessionPhase;
  orgId: string;
  userId: string;
  jwtClaims: string;
  collectionGuid: string;
  message: string | null;
  cardsScanned: number;
  activity: PiScanSessionActivity | null;
  current: PiScanSessionSight | null;
  lastCard: PiScanSessionSight | null;
  foilType: string | null;
  preferredSetCode: string | null;
  autoFeed: boolean;
  feedRequested: boolean;
  startedAt: number;
  pausedMs: number;
  pauseStartedAt: number | null;
  pauseRequested: boolean;
  stopRequested: boolean;
  handedOff: boolean;
  locked: boolean;
  portHeld: boolean;
  context: PiScanRunContext | null;
  link: SorterLink | null;
  done: Promise<void>;
  resolveDone: () => void;
}

export interface PiScanFrameMatch {
  image: Buffer;
  orientation: "upright" | "rotated";
  result: CardMatchSearchResult;
  embedding: number[] | null;
  ocr: OcrDiagnostics | null;
  matchedBy: ScanMatchSource;
  lowConfidenceFromOcr: boolean;
  detection: ScanDetectionDiagnostics;
  detectedColor: string | null;
}

export interface PiScanStartInput {
  orgId: string;
  userId: string;
  jwtClaims: string;
  body: PiScanSessionStartBody;
}

export type PiScanStartResult =
  | { ok: true; state: PiScanSessionState }
  | {
      ok: false;
      status: 400 | 409;
      code: PiScanSessionStartCode;
      message: string;
    };
