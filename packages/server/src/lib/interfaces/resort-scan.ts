import type { StoredScanImage } from "./scan-images";

export interface FindCardToResortInput {
  orgId: string;
  collectionId: number;
  gameId: number | null;
  cardId: string;
  scanIsFoil: boolean;
}

export interface CardToResort {
  id: number;
  isFoil: boolean;
  foilType: string | null;
  condition: string;
  hasCapturedImage: boolean;
}

export interface MoveResortedCardInput {
  rowId: number;
  orgId: string;
  scanId: string;
  scannedAt: number;
  binNumber: number | null | undefined;
  scannedByUserId: string;
  scannedByDeviceId: number | null;
  capturedImage: StoredScanImage | null;
}
