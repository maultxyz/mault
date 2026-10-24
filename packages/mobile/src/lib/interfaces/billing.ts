export interface BillingStatus {
  plan: "free" | "business";
  status: string | null;
  cancelAtPeriodEnd?: boolean;
  currentPeriodEnd?: string | null;
  cardsScannedToday: number;
  dailyLimit: number | null;
  maxConnectedSorters?: number | null;
  maxSoundRules?: number | null;
  maxNotificationRules?: number | null;
  chaosSort?: boolean;
  storage?: boolean;
  apiAccess?: boolean;
  businessTools?: boolean;
}
