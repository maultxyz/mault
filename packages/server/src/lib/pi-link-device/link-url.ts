import { PI_LINK_LOCAL_HOST_PATTERN } from "../constants/pi-hosts";

export function isSecureOrLocalUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol === "https:") return true;
    return url.protocol === "http:" && PI_LINK_LOCAL_HOST_PATTERN.test(url.hostname);
  } catch {
    return false;
  }
}
