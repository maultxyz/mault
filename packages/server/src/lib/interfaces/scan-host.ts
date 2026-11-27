import type {
  CardSearchEmbeddings,
  PiScanPendingSave,
  PiScanSessionStartCode,
  PrintingMarkScanGrids,
  ScannedCard,
} from "@magic-vault/shared";
import type { CollectionMatchScope } from "./card-search";
import type { PiScanRunContext } from "./pi-scan";

export type ScanHostContextPayload = Omit<
  PiScanRunContext,
  "heights" | "counts" | "storageBatchStarts"
> & {
  heights: [number, number][];
  counts: [number, number][];
  storageBatchStarts?: [number, number[]][];
};

export interface ScanHostContextRequest {
  collectionGuid: string;
  hardwareId: string;
}

export interface ScanHostApplyTargetRequest extends ScanHostContextRequest {
  presetGuid?: string | null;
  activatesCollection: boolean;
}

export interface ScanHostMatchRequest {
  scopes: CollectionMatchScope[];
  primaryGameKey: string;
  embeddings: CardSearchEmbeddings;
  preferredSetCodes: string[];
  printingMarkGrids: PrintingMarkScanGrids | null;
  printedLanguageCode: boolean | null;
}

export interface ScanHostOcrRequest {
  scope: CollectionMatchScope;
  tagsGame: boolean;
  imageBase64: string;
  embedding: number[];
  preferredSetCodes: string[];
}

export interface ScanHostLockRequest {
  collectionGuid: string;
}

export interface ScanHostGiftRevealRequest {
  collectionGuid: string;
  record: ScannedCard;
}

export type ScanHostPendingSaveRequest = PiScanPendingSave;

export interface ScanHostErrorBody {
  success: false;
  message: string;
  code?: PiScanSessionStartCode;
}
