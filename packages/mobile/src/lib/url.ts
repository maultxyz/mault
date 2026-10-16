import { API_BASE } from "@/lib/constants/config";

export function absoluteUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^(https?:|data:|file:)/.test(url)) return url;
  return `${API_BASE}${url.startsWith("/") ? "" : "/"}${url}`;
}
