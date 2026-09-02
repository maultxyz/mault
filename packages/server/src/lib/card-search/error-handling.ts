import type { PlayingCard, Result } from "@magic-vault/shared";
import type { CardSearchAdapter } from "./types";

function toFailure<T>(err: unknown): Result<T> {
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
        return toFailure<PlayingCard[]>(err);
      }
    },
    async searchById(id, baseUrl) {
      try {
        return await adapter.searchById(id, baseUrl);
      } catch (err) {
        return toFailure<PlayingCard>(err);
      }
    },
  };
}
