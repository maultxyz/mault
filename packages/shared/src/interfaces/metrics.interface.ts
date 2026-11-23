export interface ScanMetrics {
  totalScanned: number;
  matched: number;
  unidentified: number;
  corrected: number;
  multipleMatches: number;
  matchRate: number | null;
  averageMatchPercent: number | null;
}

export interface CardValueMetrics {
  totalCardValue?: number;
  totalCardValueCurrency?: string;
}

export interface PublicMetrics extends ScanMetrics, CardValueMetrics {}
