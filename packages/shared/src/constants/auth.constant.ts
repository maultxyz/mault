export const NEON_SOCIAL_PROVIDERS = ["github", "google", "discord", "apple"] as const;

export const NEON_AUTH_SESSION_VERIFIER_PARAM = "neon_auth_session_verifier";

export const MOBILE_SOCIAL_SIGN_IN_CALLBACK_PATH = "/auth/mobile-callback";

export const MOBILE_SOCIAL_SIGN_IN_START_PATH = "/auth/mobile-start";

export const MOBILE_SOCIAL_SIGN_IN_START_TOKEN_PARAM = "token";

export const MOBILE_SOCIAL_SIGN_IN_APP_CALLBACK_URL = "mault://auth-callback";

export const MOBILE_SOCIAL_SIGN_IN_ERROR_PARAM = "error";

export const NEON_SOCIAL_PROVIDER_NAMES = {
  github: "GitHub",
  google: "Google",
  discord: "Discord",
  apple: "Apple",
} as const;

export const NEON_PASSWORD_SIGN_IN_PROVIDER_ID = "credential";

export const LINK_SIGN_IN_PROVIDER_ERROR_KEYS_BY_CODE: Record<string, "alreadyLinkedElsewhere" | "emailMismatch"> = {
  account_already_linked_to_different_user: "alreadyLinkedElsewhere",
  "email_doesn't_match": "emailMismatch",
};
