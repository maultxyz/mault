export const PLAN_KEYS = ["free", "business"] as const;

export const PLAN_FEATURE_KEYS = ["chaosSort", "storage", "apiAccess"] as const;

export const PLAN_LIMIT_KEYS = [
  "dailyScans",
  "connectedSorters",
  "soundRules",
  "notificationRules",
] as const;

export const PLAN_LIMIT_MAX = 1_000_000;

export const BILLING_INTERVALS = ["month", "year"] as const;

export const DEFAULT_BILLING_INTERVAL = "month";
