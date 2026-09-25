import type {
  FetchOneResult,
  SyncSource,
  SyncSourceCard,
} from "../../card-search/sync-types";
import { withRawData } from "../../card-search/with-raw-data";
import { CARD_API_HEADERS } from "../../constants/card-search";
import { YUGIOH_DEFAULT_URL } from "../../constants/urls";
import { splitSetCode, type YgoCard } from "./search";

function toSyncCards(raw: YgoCard): SyncSourceCard[] {
  const primarySet = raw.card_sets?.[0];
  const { set } = primarySet ? splitSetCode(primarySet.set_code) : { set: "" };

  return (raw.card_images ?? []).map((image) =>
    withRawData(
      {
        id: String(image.id),
        name: raw.name,
        setCode: set,
        imageUrl: image.image_url,
      },
      raw,
    ),
  );
}

async function fetchCards(
  baseUrl: string,
  addLog: (msg: string) => void,
  _lang?: string,
  signal?: AbortSignal,
): Promise<SyncSourceCard[]> {
  addLog("Fetching full YGOPRODeck card database...");
  const res = await fetch(baseUrl, { headers: CARD_API_HEADERS, signal });
  if (!res.ok) {
    throw new Error(`YGOPRODeck fetch failed: ${res.status}`);
  }

  const json = (await res.json()) as { data?: YgoCard[] };
  const rows = json.data ?? [];
  const cards = rows.flatMap(toSyncCards);
  addLog(`Fetched ${rows.length} cards (${cards.length} artworks).`);

  return cards;
}

async function fetchOne(id: string, baseUrl: string): Promise<FetchOneResult> {
  const url = `${baseUrl}?id=${encodeURIComponent(id)}`;
  const res = await fetch(url, { headers: CARD_API_HEADERS });
  if (!res.ok) return { card: null, urls: [`${url} [HTTP ${res.status}]`] };

  const json = (await res.json()) as { data?: YgoCard[] };
  const raw = json.data?.[0];
  if (!raw) return { card: null, urls: [url] };

  const cards = toSyncCards(raw);
  const match = cards.find((c) => c.id === id) ?? cards[0];
  return { card: match ?? null, urls: [url] };
}

export const yugiohSyncSource: SyncSource = {
  gameKey: "yugioh",
  label: "Yu-Gi-Oh! (YGOPRODeck API)",
  defaultUrl: YUGIOH_DEFAULT_URL,
  fetchHeaders: CARD_API_HEADERS,
  languages: ["en"],
  fetchCards,
  fetchOne,
};
