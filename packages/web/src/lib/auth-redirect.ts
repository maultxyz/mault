import { AUTH_REDIRECT_PARAM, SIGN_IN_PATH } from "@/lib/constants/auth";

export function safeAuthRedirectPath(value: string | null | undefined): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return null;
  return value;
}

export function authPathReturningTo(authPath: string, returnPath: string): string {
  const safeReturnPath = safeAuthRedirectPath(returnPath);
  if (!safeReturnPath) return authPath;
  return `${authPath}?${new URLSearchParams({ [AUTH_REDIRECT_PARAM]: safeReturnPath })}`;
}

export function signInPathReturningTo(returnPath: string): string {
  return authPathReturningTo(SIGN_IN_PATH, returnPath);
}
