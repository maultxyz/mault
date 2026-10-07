export interface BillingStatus {
  plan: "free" | "business";
  status: string | null;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  cardsScannedToday: number;
  dailyLimit: number | null;
  maxConnectedSorters?: number | null;
  maxSoundRules?: number | null;
  maxNotificationRules?: number | null;
  chaosSort?: boolean;
  storage?: boolean;
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
  githubStars?: number;
}

export interface PlanFeaturesProps {
  billing: BillingStatus;
}

export interface GithubRepoResponse {
  stargazers_count: number;
}
