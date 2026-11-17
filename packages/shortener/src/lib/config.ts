import type { ShortenerConfig } from "./interfaces/shortener";

function trimmedOrNull(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function readShortenerConfig(environment: NodeJS.ProcessEnv): ShortenerConfig {
  return {
    apiSecret: trimmedOrNull(environment.SHORTENER_API_SECRET),
    shortLinkTargetOrigin:
      trimmedOrNull(environment.SHORT_LINK_TARGET_ORIGIN)?.replace(/\/$/, "") ?? null,
  };
}
