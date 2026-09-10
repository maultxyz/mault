import { LOCAL_AUTH_TOKEN_STORAGE_KEY } from "@/lib/constants/storage-keys";

export function getLocalToken(): string | null {
  return localStorage.getItem(LOCAL_AUTH_TOKEN_STORAGE_KEY);
}

export function setLocalToken(token: string | null): void {
  if (token) localStorage.setItem(LOCAL_AUTH_TOKEN_STORAGE_KEY, token);
  else localStorage.removeItem(LOCAL_AUTH_TOKEN_STORAGE_KEY);
}
