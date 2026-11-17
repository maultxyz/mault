import {
  MOBILE_SOCIAL_SIGN_IN_APP_CALLBACK_URL,
  MOBILE_SOCIAL_SIGN_IN_ERROR_PARAM,
  NEON_AUTH_SESSION_VERIFIER_PARAM,
} from "@magic-vault/shared";

export function buildMobileSocialSignInAppCallbackUrl(
  searchParams: URLSearchParams,
): string {
  const forwardedParams = new URLSearchParams();
  for (const name of [
    NEON_AUTH_SESSION_VERIFIER_PARAM,
    MOBILE_SOCIAL_SIGN_IN_ERROR_PARAM,
  ]) {
    const value = searchParams.get(name);
    if (value) forwardedParams.set(name, value);
  }
  const query = forwardedParams.toString();
  return query
    ? `${MOBILE_SOCIAL_SIGN_IN_APP_CALLBACK_URL}?${query}`
    : MOBILE_SOCIAL_SIGN_IN_APP_CALLBACK_URL;
}
