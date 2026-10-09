import { PHONE_CAMERA_PATH_PATTERN } from "@/lib/constants/scanner";

export function parsePhonePairingPath(text: string): string | null {
  let url: URL;
  try {
    url = new URL(text.trim(), window.location.origin);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (!PHONE_CAMERA_PATH_PATTERN.test(url.pathname)) return null;
  return `${url.pathname}${url.search}`;
}
