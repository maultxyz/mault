import {
  BROWSER_SYNC_IMAGE_PROXY_HOSTS,
  proxiedImageUrl,
} from "@magic-vault/shared";

export function syncImageUrl(imageUrl: string, apiBase: string): string {
  let parsed: URL;
  try {
    parsed = new URL(imageUrl);
  } catch {
    return imageUrl;
  }
  return parsed.protocol === "https:" &&
    BROWSER_SYNC_IMAGE_PROXY_HOSTS.has(parsed.hostname)
    ? `${apiBase}${proxiedImageUrl(imageUrl)}`
    : imageUrl;
}
