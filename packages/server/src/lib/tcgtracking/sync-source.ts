import type { SyncSource } from "../interfaces/card-search";
import { TCGTRACKING_GAMES } from "./games";
import { fetchOneWithTcgtracking, mergeTcgtrackingCatalog } from "./merge";

export function withTcgtrackingSync(source: SyncSource): SyncSource {
  if (!TCGTRACKING_GAMES[source.gameKey]) return source;
  return {
    ...source,
    label: `${source.label} + TCGTracking`,
    async fetchCards(baseUrl, addLog, lang, signal) {
      const cards = await source.fetchCards(baseUrl, addLog, lang, signal);
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
