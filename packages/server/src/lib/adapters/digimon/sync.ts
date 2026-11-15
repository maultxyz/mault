import { withRawData } from "../../card-search/with-raw-data";
import {
  CARD_API_HEADERS,
  DIGIMON_LANGUAGES,
  DIGIMON_TCGPLAYER_CATEGORY_ID,
} from "../../constants/card-search";
import {
  DIGIMON_DEFAULT_URL,
  TCGTRACKING_API_ROOT,
} from "../../constants/urls";
import type { SyncSource, SyncSourceCard } from "../../interfaces/card-search";
import type { TcgtrackingCatalogEntry } from "../../interfaces/tcgtracking";
import {
  fetchTcgtrackingProductEntry,
  loadTcgtrackingCatalog,
  tcgtrackingCardImage,
} from "../../tcgtracking/catalog";
import { digimonCardName, digimonSetCode } from "./search";

function toSyncCard(entry: TcgtrackingCatalogEntry): SyncSourceCard {
  return withRawData(
    {
      id: String(entry.product.id),
      name: digimonCardName(entry),
      setCode: digimonSetCode(entry),
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
    DIGIMON_TCGPLAYER_CATEGORY_ID,
    addLog,
    signal,
  );
  if (signal?.aborted) throw new Error("Digimon catalog fetch aborted");
  return entries.map(toSyncCard);
}

async function fetchOne(id: string) {
  const productId = Number(id);
  const entry = Number.isInteger(productId)
    ? await fetchTcgtrackingProductEntry(
        DIGIMON_TCGPLAYER_CATEGORY_ID,
        productId,
      )
    : null;
  const urls = [`${TCGTRACKING_API_ROOT}/products/${id}`];
  return { card: entry ? toSyncCard(entry) : null, urls };
}

export const digimonSyncSource: SyncSource = {
  gameKey: "digimon",
  label: "Digimon Card Game (TCGTracking)",
  defaultUrl: DIGIMON_DEFAULT_URL,
  fetchHeaders: CARD_API_HEADERS,
  languages: DIGIMON_LANGUAGES,
  fetchCards,
  fetchOne,
};
