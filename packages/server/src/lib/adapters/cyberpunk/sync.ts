import type {
  FetchOneResult,
  SyncSource,
  SyncSourceCard,
} from "../../interfaces/card-search";
import { withRawData } from "../../card-search/with-raw-data";
import { CARD_API_HEADERS } from "../../constants/card-search";
import { CYBERPUNK_DEFAULT_URL } from "../../constants/urls";
import type { NetdeckCard, NetdeckPrinting } from "../../interfaces/netdeck";
import {
  fetchNetdeckPage,
  findNetdeckCardByPrinting,
  netdeckPrintingsForLang,
  netdeckUrlForLang,
  toStoredNetdeckCard,
} from "../../netdeck";

function toSyncCard(
  card: NetdeckCard,
  printing: NetdeckPrinting,
): SyncSourceCard {
  return withRawData(
    {
      id: printing.id,
      name: card.display_name,
      setCode: printing.set.code,
      imageUrl: printing.image_url,
    },
    toStoredNetdeckCard(card, printing),
  );
}

async function fetchCards(
  baseUrl: string,
  addLog: (msg: string) => void,
  lang = "en",
  signal?: AbortSignal,
): Promise<SyncSourceCard[]> {
  const url = netdeckUrlForLang(baseUrl, lang);
  const all: SyncSourceCard[] = [];
  let offset = 0;
  let total = 0;

  do {
    const page = await fetchNetdeckPage(url, offset, signal);
    total = page.total;
    for (const card of page.items) {
      all.push(
        ...netdeckPrintingsForLang(card).map((printing) =>
          toSyncCard(card, printing),
        ),
      );
    }
    offset += page.limit;
    addLog(
      `Fetched ${Math.min(offset, total)} of ${total} cards (${all.length} printings so far)...`,
    );
  } while (offset < total && !signal?.aborted);

  return all;
}

async function fetchOne(
  id: string,
  baseUrl: string,
  lang = "en",
): Promise<FetchOneResult> {
  const { card, urls } = await findNetdeckCardByPrinting(
    id,
    netdeckUrlForLang(baseUrl, lang),
  );
  const printing = card?.printings.find((p) => p.id === id);
  if (!card || !printing) return { card: null, urls };
  return { card: toSyncCard(card, printing), urls };
}

export const cyberpunkSyncSource: SyncSource = {
  gameKey: "cyberpunk",
  label: "Cyberpunk TCG (netdeck.gg)",
  defaultUrl: CYBERPUNK_DEFAULT_URL,
  fetchHeaders: CARD_API_HEADERS,
  languages: ["en", "fr"],
  fetchCards,
  fetchOne,
};
