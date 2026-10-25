import type { PlayingCard, Result } from "@magic-vault/shared";
import type { CardSearchAdapter } from "../interfaces/card-search";
import { rollbar } from "../rollbar";

function isUpstreamUnavailable(err: unknown): boolean {
  return (
    err instanceof Error &&
    (err.name === "TimeoutError" ||
      (err.name === "TypeError" && err.message === "fetch failed"))
  );
}

function toFailure<T>(err: unknown, adapterUrl: string): Result<T> {
  console.error(`[card-search] ${adapterUrl} failed:`, err);
  if (!isUpstreamUnavailable(err)) {
    rollbar.error(err instanceof Error ? err : String(err), { adapterUrl });
  }
  const message =
    err instanceof Error && err.name === "TimeoutError"
      ? "The card database took too long to respond. Please try again."
      : "Could not reach the card database. Please try again.";
  return { success: false, message };
}

export function withErrorHandling(
  adapter: CardSearchAdapter,
): CardSearchAdapter {
  return {
    ...adapter,
    async search(query, baseUrl, lang) {
      try {
        return await adapter.search(query, baseUrl, lang);
      } catch (err) {
        return toFailure<PlayingCard[]>(err, adapter.defaultUrl);
      }
    },
    async searchById(id, baseUrl) {
      try {
        return await adapter.searchById(id, baseUrl);
      } catch (err) {
        return toFailure<PlayingCard>(err, adapter.defaultUrl);
      }
    },
  };
}
