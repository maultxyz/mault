import {
  LINK_SIGN_IN_PROVIDER_ERROR_KEYS_BY_CODE,
  NEON_PASSWORD_SIGN_IN_PROVIDER_ID,
  NEON_SOCIAL_PROVIDERS,
} from "./constants/auth.constant";
import type { LinkedSignInAccount, NeonSocialProvider } from "./interfaces/auth.interface";

export function isNeonSocialProvider(providerId: string): providerId is NeonSocialProvider {
  return (NEON_SOCIAL_PROVIDERS as readonly string[]).includes(providerId);
}

export function sortLinkedSignInAccounts(accounts: readonly LinkedSignInAccount[]): LinkedSignInAccount[] {
  const order = (providerId: string) =>
    providerId === NEON_PASSWORD_SIGN_IN_PROVIDER_ID
      ? -1
      : isNeonSocialProvider(providerId)
        ? NEON_SOCIAL_PROVIDERS.indexOf(providerId)
        : NEON_SOCIAL_PROVIDERS.length;
  return [...accounts].sort((a, b) => order(a.providerId) - order(b.providerId));
}

export function unlinkedNeonSocialProviders(accounts: readonly LinkedSignInAccount[]): NeonSocialProvider[] {
  const linked = new Set(accounts.map((account) => account.providerId));
  return NEON_SOCIAL_PROVIDERS.filter((provider) => !linked.has(provider));
}

export function canUnlinkSignInAccount(
  accounts: readonly LinkedSignInAccount[],
  account: LinkedSignInAccount,
): boolean {
  return account.providerId !== NEON_PASSWORD_SIGN_IN_PROVIDER_ID && accounts.length > 1;
}

export function linkSignInProviderErrorKey(code: string): "alreadyLinkedElsewhere" | "emailMismatch" | "linkFailedWithCode" {
  const normalizedCode = code.toLowerCase();
  return Object.prototype.hasOwnProperty.call(LINK_SIGN_IN_PROVIDER_ERROR_KEYS_BY_CODE, normalizedCode)
    ? LINK_SIGN_IN_PROVIDER_ERROR_KEYS_BY_CODE[normalizedCode]
    : "linkFailedWithCode";
}
