export type ScanImageKind = "cards" | "unmatched";

export type ScanImageSide = "front" | "back";

export interface ScanImageTarget {
  orgId: string;
  collectionGuid: string;
  scanId: string;
  kind: ScanImageKind;
  side?: ScanImageSide;
}

export interface StoredScanImage {
  key: string | null;
  dataUrl: string | null;
}

export interface StoredScanImageRow {
  capturedImageKey: string | null;
  capturedImageDataUrl: string | null;
}

export interface StoredBackScanImageRow {
  capturedBackImageKey: string | null;
  capturedBackImageDataUrl: string | null;
}
