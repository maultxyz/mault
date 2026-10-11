import type { PlanConfig } from "@magic-vault/shared";

export const DEFAULT_PUBLIC_PLAN_CONFIG: PlanConfig = {
  free: {
    features: { chaosSort: false, storage: false, apiAccess: false },
    limits: {
      dailyScans: 50,
      connectedSorters: 1,
      soundRules: 1,
      notificationRules: 1,
    },
  },
  business: {
    features: { chaosSort: true, storage: true, apiAccess: true },
    limits: {
      dailyScans: null,
      connectedSorters: null,
      soundRules: null,
      notificationRules: null,
    },
  },
};

export const PRICING_SHARED_FEATURE_KEYS = [
  "collections",
  "games",
  "notifications",
] as const;
