import { MOBILE_SOCIAL_SIGN_IN_APP_CALLBACK_URL } from "@magic-vault/shared";

export function redirectSystemPath({ path }: { path: string; initial: boolean }): string | null {
  return path.startsWith(MOBILE_SOCIAL_SIGN_IN_APP_CALLBACK_URL) ? null : path;
}
