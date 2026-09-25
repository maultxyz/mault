export interface TcgcsvResponse<T> {
  success: boolean;
  errors: string[];
  results: T[];
}

export interface TcgcsvGroup {
  groupId: number;
  name: string;
}

export interface TcgcsvPrice {
  productId: number;
  subTypeName: string;
  lowPrice: number | null;
  midPrice: number | null;
  highPrice: number | null;
  marketPrice: number | null;
  directLowPrice: number | null;
}

export interface PriceSyncResult {
  skipped: boolean;
  prices: number;
  failedGroups: number;
}
