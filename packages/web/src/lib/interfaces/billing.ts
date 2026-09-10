export interface BillingStatus {
  plan: "free" | "business";
  status: string | null;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  cardsScannedToday: number;
  dailyLimit: number | null;
}
