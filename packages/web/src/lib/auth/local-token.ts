import { LOCAL_AUTH_TOKEN_STORAGE_KEY } from "@/lib/constants/storage-keys";

export function getLocalToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(LOCAL_AUTH_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setLocalToken(token: string | null): void {
  if (token) localStorage.setItem(LOCAL_AUTH_TOKEN_STORAGE_KEY, token);
  else localStorage.removeItem(LOCAL_AUTH_TOKEN_STORAGE_KEY);
}
