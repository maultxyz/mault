import type { SyncSource, SyncSourceCard } from "../interfaces/card-search";
import { markSyncFetchIncomplete } from "../sync-job/fetch-completeness";
import { TCGTRACKING_GAMES } from "./games";
import { fetchOneWithTcgtracking, mergeTcgtrackingCatalog } from "./merge";
import { loadStoredPrimaryCards } from "./stored-primaries";

async function fetchPrimaryCardsOrStoredCards(
  source: SyncSource,
  baseUrl: string,
  addLog: (msg: string) => void,
  lang: string,
  signal: AbortSignal | undefined,
): Promise<SyncSourceCard[]> {
  try {
    return await source.fetchCards(baseUrl, addLog, lang, signal);
  } catch (error) {
    if (signal?.aborted || lang !== "en") throw error;
    const reason = error instanceof Error ? error.message : String(error);
    markSyncFetchIncomplete(`${source.label} unavailable: ${reason}`);
    const storedCards = await loadStoredPrimaryCards(source.gameKey, lang);
    addLog(
      `${source.label} failed (${reason}). Using ${storedCards.length} stored cards so TCGTracking can still add new cards; nothing will be pruned.`,
    );
    return storedCards;
  }
}

export function withTcgtrackingSync(source: SyncSource): SyncSource {
  if (!TCGTRACKING_GAMES[source.gameKey]) return source;
  return {
    ...source,
    label: `${source.label} + TCGTracking`,
    async fetchCards(baseUrl, addLog, lang, signal) {
      const cards = await fetchPrimaryCardsOrStoredCards(
        source,
        baseUrl,
        addLog,
        lang ?? "en",
        signal,
      );
      return mergeTcgtrackingCatalog(
        source.gameKey,
        cards,
        lang ?? "en",
        addLog,
        signal,
      );
    },
    fetchOne(id, baseUrl, lang) {
      return fetchOneWithTcgtracking(source.gameKey, id, lang ?? "en", () =>
        source.fetchOne(id, baseUrl, lang),
      );
    },
  };
}
