export const INACTIVE_SUBSCRIPTION_STATUSES = [
  "canceled",
  "incomplete_expired",
] as const;

export const SUPPORT_PROMPT_FIRST_AFTER_SCANS = 100;
export const SUPPORT_PROMPT_EVERY_SCANS = 500;
export const SUPPORT_PROMPT_MIN_INTERVAL_MS = 14 * 24 * 60 * 60 * 1000;
export const SUPPORT_PROMPT_TOAST_ID = "support-prompt";
