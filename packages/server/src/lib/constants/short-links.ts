export const SHORT_LINK_NOT_FOUND_MESSAGE = "This link doesn't exist.";
export const SHORTENER_SECRET_MISSING_MESSAGE = "SHORTENER_API_SECRET is not configured.";
export const SHORTENER_REQUEST_TIMEOUT_MS = 10_000;
export const SHORT_LINK_STARTUP_SYNC_ATTEMPTS = 10;
export const SHORT_LINK_STARTUP_SYNC_RETRY_MS = 30_000;
export const CUSTOM_SHORT_LINK_FAILURE_MESSAGES = {
  disabled: "Short links are off. Set SHORT_LINK_BASE_URL on the API to turn them on.",
  codeTaken: "That short link code is already in use.",
  notFound: "That short link no longer exists.",
} as const;
