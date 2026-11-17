import type { FoilDetectionMethod } from "./foil-detection.interface";

export interface AdminFoilLabelQueueItem {
  scanId: string;
  orgName: string | null;
  collectionName: string;
  gameKey: string | null;
  cardName: string | null;
  setCode: string | null;
  setName: string | null;
  collectorNumber: string | null;
  savedFoilType: string | null;
  foilScore: number | null;
  foilDetectionMethod: FoilDetectionMethod | null;
  scannedAt: string;
  capturedImageUrl: string | null;
  catalogImageUrl: string | null;
}

export interface AdminFoilLabelCounts {
  remaining: number;
  labelledFoil: number;
  labelledNotFoil: number;
}

export interface AdminFoilLabelQueue {
  items: AdminFoilLabelQueueItem[];
  counts: AdminFoilLabelCounts;
}

export interface AdminFoilLabelRequest {
  scanId: string;
  isFoil: boolean;
}
