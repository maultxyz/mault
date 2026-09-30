export type ScanImageKind = "cards" | "unmatched";

export interface ScanImageTarget {
  orgId: string;
  collectionGuid: string;
  scanId: string;
  kind: ScanImageKind;
}

export interface StoredScanImage {
  key: string | null;
  dataUrl: string | null;
}

export interface StoredScanImageRow {
  capturedImageKey: string | null;
  capturedImageDataUrl: string | null;
}
