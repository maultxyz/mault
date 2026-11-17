export const JWT_REFRESH_MARGIN_MS = 60_000;
export const SESSION_RESTORE_RETRY_MIN_MS = 2_000;
export const SESSION_RESTORE_RETRY_MAX_MS = 30_000;
export const WEB_SIGN_UP_PATH = "/auth/sign-up";
export const NEON_AUTH_SESSION_CHALLENGE_COOKIE_PATTERN = /__Secure-neon-auth\.session_chall[ae]nge=[^;,\s]+/g;
export const SOCIAL_SIGN_IN_CANCELLED_ERROR = "cancelled";
export const SOCIAL_SIGN_IN_PROVIDER_NAMES = {
  github: "GitHub",
  google: "Google",
  discord: "Discord",
  apple: "Apple",
} as const;
export const SIGN_IN_BRAND_ICON_SIZE = 48;
