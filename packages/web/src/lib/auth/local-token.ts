const TOKEN_KEY = "localAuthToken";

export function getLocalToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setLocalToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}
