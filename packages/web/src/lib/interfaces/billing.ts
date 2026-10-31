import type {
  BillingInterval,
  BillingStatus,
  PaidPlanKey,
  PlanIntervalPrices,
} from "@magic-vault/shared";

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

export interface CheckoutRequest {
  plan: PaidPlanKey;
  interval: BillingInterval;
}

export interface PlanUpgradeOptionProps {
  plan: PaidPlanKey;
  prices: PlanIntervalPrices;
  isStartingCheckout: boolean;
  onCheckout: (request: CheckoutRequest) => void;
}

export interface MemberSeatLock {
  orgId: string;
  limit: number;
}

export interface PlanLockHintProps {
  message: string;
}
