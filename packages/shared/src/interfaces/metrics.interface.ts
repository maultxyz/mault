export interface PublicMetrics {
  totalScanned: number;
  matched: number;
  unidentified: number;
  corrected: number;
  multipleMatches: number;
  matchRate: number | null;
  averageMatchPercent: number | null;
}
