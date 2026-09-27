export interface BillingStatus {
  plan: "free" | "business";
  status: string | null;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  cardsScannedToday: number;
  dailyLimit: number | null;
  maxConnectedSorters?: number | null;
}

export interface SupportPromptState {
  scans: number;
  lastShownAt: number | null;
  optedOut: boolean;
}

export interface SupportPromptToastProps {
  toastId: string | number;
  showSubscribe: boolean;
  onSubscribe: () => void;
}
