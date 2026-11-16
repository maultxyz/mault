import { withRawData } from "../card-search/with-raw-data";
import { CARD_API_HEADERS } from "../constants/card-search";
import { TCGTRACKING_API_ROOT } from "../constants/urls";
import type { SyncSource, SyncSourceCard } from "../interfaces/card-search";
import type {
  TcgtrackingCatalogEntry,
  TcgtrackingCatalogSyncSourceOptions,
} from "../interfaces/tcgtracking";
import {
  fetchTcgtrackingProductEntry,
  loadTcgtrackingCatalog,
  tcgtrackingCardImage,
} from "./catalog";

export function createTcgtrackingCatalogSyncSource(
  options: TcgtrackingCatalogSyncSourceOptions,
): SyncSource {
  const toSyncCard = (entry: TcgtrackingCatalogEntry): SyncSourceCard =>
    withRawData(
      {
        id: String(entry.product.id),
        name: options.cardName(entry),
        setCode: options.setCode(entry),
        imageUrl: tcgtrackingCardImage(entry.product.id).normal,
      },
      entry,
    );

  return {
    gameKey: options.gameKey,
    label: options.label,
    defaultUrl: options.defaultUrl,
    fetchHeaders: CARD_API_HEADERS,
    languages: options.languages,
    async fetchCards(_baseUrl, addLog, _lang, signal) {
      const entries = await loadTcgtrackingCatalog(
        options.categoryId,
        addLog,
        signal,
      );
      if (signal?.aborted) {
        throw new Error(`${options.gameName} catalog fetch aborted`);
      }
      return entries.map(toSyncCard);
    },
    async fetchOne(id) {
      const productId = Number(id);
      const entry = Number.isInteger(productId)
        ? await fetchTcgtrackingProductEntry(options.categoryId, productId)
        : null;
      const urls = [`${TCGTRACKING_API_ROOT}/products/${id}`];
      return { card: entry ? toSyncCard(entry) : null, urls };
    },
  };
}
