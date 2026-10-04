export const PLAN_KEYS = ["free", "business"] as const;

export const PLAN_FEATURE_KEYS = ["chaosSort", "storage"] as const;

export const PLAN_LIMIT_KEYS = [
  "dailyScans",
  "connectedSorters",
  "soundRules",
  "notificationRules",
] as const;

export const PLAN_LIMIT_MAX = 1_000_000;
