import type {
  BinConfig,
  BinRoute,
  BinSet,
  FieldMeta,
  PiScanSessionActivity,
  PiScanSessionPhase,
  PiScanSessionSight,
  ScanRegion,
} from "@magic-vault/shared";
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
