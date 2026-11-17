import { withRawData } from "../../card-search/with-raw-data";
import {
  CARD_API_HEADERS,
  POKEMON_JAPAN_LANGUAGES,
  POKEMON_JAPAN_TCGPLAYER_CATEGORY_ID,
} from "../../constants/card-search";
import {
  POKEMON_JAPAN_DEFAULT_URL,
  TCGTRACKING_API_ROOT,
} from "../../constants/urls";
import type { SyncSource, SyncSourceCard } from "../../interfaces/card-search";
import type { TcgtrackingCatalogEntry } from "../../interfaces/tcgtracking";
import {
  fetchTcgtrackingProductEntry,
  loadTcgtrackingCatalog,
  tcgtrackingCardImage,
} from "../../tcgtracking/catalog";
import { pokemonJapanCardName, pokemonJapanSetCode } from "./search";

function toSyncCard(entry: TcgtrackingCatalogEntry): SyncSourceCard {
  return withRawData(
    {
      id: String(entry.product.id),
      name: pokemonJapanCardName(entry),
      setCode: pokemonJapanSetCode(entry),
      imageUrl: tcgtrackingCardImage(entry.product.id).normal,
    },
    entry,
  );
}

async function fetchCards(
  _baseUrl: string,
  addLog: (msg: string) => void,
  _lang?: string,
  signal?: AbortSignal,
): Promise<SyncSourceCard[]> {
  const entries = await loadTcgtrackingCatalog(
    POKEMON_JAPAN_TCGPLAYER_CATEGORY_ID,
    addLog,
    signal,
  );
  if (signal?.aborted) throw new Error("Japanese Pokémon catalog fetch aborted");
  return entries.map(toSyncCard);
}

async function fetchOne(id: string) {
  const productId = Number(id);
  const entry = Number.isInteger(productId)
    ? await fetchTcgtrackingProductEntry(
        POKEMON_JAPAN_TCGPLAYER_CATEGORY_ID,
        productId,
      )
    : null;
  const urls = [`${TCGTRACKING_API_ROOT}/products/${id}`];
  return { card: entry ? toSyncCard(entry) : null, urls };
}

export const pokemonJapanSyncSource: SyncSource = {
  gameKey: "pokemonjp",
  label: "Pokémon Japan (TCGTracking)",
  defaultUrl: POKEMON_JAPAN_DEFAULT_URL,
  fetchHeaders: CARD_API_HEADERS,
  languages: POKEMON_JAPAN_LANGUAGES,
  fetchCards,
  fetchOne,
};
