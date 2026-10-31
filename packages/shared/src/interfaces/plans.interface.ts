import type {
  BILLING_INTERVALS,
  PAID_PLAN_KEYS,
  PLAN_FEATURE_KEYS,
  PLAN_KEYS,
  PLAN_LIMIT_KEYS,
} from "../constants/plans.constant";

export type PlanKey = (typeof PLAN_KEYS)[number];
export type PaidPlanKey = (typeof PAID_PLAN_KEYS)[number];
export type PlanFeatureKey = (typeof PLAN_FEATURE_KEYS)[number];
export type PlanLimitKey = (typeof PLAN_LIMIT_KEYS)[number];
export type BillingInterval = (typeof BILLING_INTERVALS)[number];

export interface PlanPriceInfo {
  amount: number;
  currency: string;
  interval: string;
}

export type PlanIntervalPrices = Record<BillingInterval, PlanPriceInfo | null>;

export type PaidPlanPrices = Record<PaidPlanKey, PlanIntervalPrices>;

export interface PlanSettings {
  features: Record<PlanFeatureKey, boolean>;
  limits: Record<PlanLimitKey, number | null>;
}

export type PlanConfig = Record<PlanKey, PlanSettings>;

export interface AdminPlanConfigResponse {
  config: PlanConfig;
  defaults: PlanConfig;
  billingEnabled: boolean;
}

export interface BillingStatus {
  plan: PlanKey;
  status: string | null;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  interval?: BillingInterval | null;
  prices?: PlanIntervalPrices;
  planPrices?: PaidPlanPrices;
  cardsScannedToday: number;
  dailyLimit: number | null;
  maxOrganizations?: number | null;
  ownedOrganizations?: number;
  maxMembersPerOrg?: number | null;
  memberCount?: number;
  maxConnectedSorters?: number | null;
  maxSoundRules?: number | null;
  maxNotificationRules?: number | null;
  maxCollections?: number | null;
  collectionCount?: number;
  chaosSort?: boolean;
  repacks?: boolean;
  customSounds?: boolean;
  storage?: boolean;
  apiAccess?: boolean;
  businessTools?: boolean;
}

export interface MemberSeatLimitErrorBody {
  success: false;
  code: string;
  message: string;
  limit: number;
}
