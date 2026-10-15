export interface AdminScanRow {
  scanId: string;
  embedding: number[] | null;
  gameKey: string | null;
  lang: string;
  matchAllLanguages: boolean;
  capturedImageKey: string | null;
  capturedImageDataUrl: string | null;
}
