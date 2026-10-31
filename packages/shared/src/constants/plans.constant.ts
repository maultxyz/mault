export const PLAN_KEYS = ["free", "enthusiast", "business"] as const;

export const PAID_PLAN_KEYS = ["enthusiast", "business"] as const;

export const DEFAULT_PAID_PLAN = "business";

export const PLAN_FEATURE_KEYS = [
  "chaosSort",
  "repacks",
  "customSounds",
  "fleetHealth",
  "storage",
  "apiAccess",
  "businessTools",
] as const;

export const PLAN_LIMIT_KEYS = [
  "dailyScans",
  "organizations",
  "membersPerOrg",
  "connectedSorters",
  "soundRules",
  "notificationRules",
  "collections",
] as const;

export const PLAN_LIMIT_MAX = 1_000_000;

export const BILLING_INTERVALS = ["month", "year"] as const;

export const DEFAULT_BILLING_INTERVAL = "month";

export const PLAN_PREVIEW_HEADER = "X-Plan-Preview";

export const PLAN_PREVIEW_ROLE = "admin";

export const MEMBER_SEAT_LIMIT_ERROR_CODE = "member_seat_limit";

export const MEMBER_SEAT_LIMIT_HTTP_STATUS = 402;
