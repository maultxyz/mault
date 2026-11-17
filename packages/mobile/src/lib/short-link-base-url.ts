import type { Result } from "@magic-vault/shared";
import { apiGet, unwrapOr } from "@/lib/api/client";
import { SHORT_LINK_BASE_URL } from "@/lib/constants/config";
import type { PublicVersionInfo } from "@/lib/interfaces/config";

let serverShortLinkBaseUrl: string | null = null;

export function shortLinkBaseUrl(): string | null {
  return serverShortLinkBaseUrl ?? SHORT_LINK_BASE_URL;
}

export async function loadShortLinkBaseUrl(): Promise<void> {
  const versionInfo = await unwrapOr<PublicVersionInfo | null>(
    apiGet<Result<PublicVersionInfo>>("/api/public/version"),
    null,
  ).catch(() => null);
  const baseUrl = versionInfo?.shortLinkBaseUrl?.trim().replace(/\/$/, "");
  if (baseUrl) serverShortLinkBaseUrl = baseUrl;
}
