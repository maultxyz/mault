import type { Result } from "@magic-vault/shared";
import { apiGet, unwrapOr } from "@/lib/api/client";
import type { PublicVersionInfo } from "@/lib/interfaces/config";

let pendingVersionInfo: Promise<PublicVersionInfo | null> | null = null;

export function loadPublicVersionInfo(): Promise<PublicVersionInfo | null> {
  if (!pendingVersionInfo) {
    pendingVersionInfo = unwrapOr<PublicVersionInfo | null>(
      apiGet<Result<PublicVersionInfo>>("/api/public/version"),
      null,
    ).catch(() => {
      pendingVersionInfo = null;
      return null;
    });
  }
  return pendingVersionInfo;
}
