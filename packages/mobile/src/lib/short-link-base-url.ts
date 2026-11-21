import { SHORT_LINK_BASE_URL } from "@/lib/constants/config";
import { loadPublicVersionInfo } from "@/lib/public-version-info";

let serverShortLinkBaseUrl: string | null = null;

export function shortLinkBaseUrl(): string | null {
  return serverShortLinkBaseUrl ?? SHORT_LINK_BASE_URL;
}

export async function loadShortLinkBaseUrl(): Promise<void> {
  const versionInfo = await loadPublicVersionInfo();
  const baseUrl = versionInfo?.shortLinkBaseUrl?.trim().replace(/\/$/, "");
  if (baseUrl) serverShortLinkBaseUrl = baseUrl;
}
