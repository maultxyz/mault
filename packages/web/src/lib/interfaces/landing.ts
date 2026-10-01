export interface PublicPricing {
  business: { amount: number; currency: string; interval: string } | null;
  freeDailyScanLimit: number;
  freeMaxConnectedSorters?: number;
  freeMaxSoundRules?: number;
  maxConnectedSorters?: number;
}
