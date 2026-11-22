import type {
  FetchOneResult,
  SyncSource,
  SyncSourceCard,
} from "../../interfaces/card-search";
import { withRawData } from "../../card-search/with-raw-data";
import { CARD_API_HEADERS } from "../../constants/card-search";
import { YUGIOH_DEFAULT_URL } from "../../constants/urls";
import { splitSetCode } from "./search";
import {
  hasSeveralYugiohArtworks,
  mainYugiohArtworkOf,
  yugiohPasscodeOf,
  yugiohPrintingId,
  yugiohPrintingsOf,
} from "./printings";
import type { YgoCard } from "../../interfaces/yugioh";

function cardinfoUrlWithReleaseDates(baseUrl: string): URL {
  const url = new URL(baseUrl);
  url.searchParams.set("misc", "yes");
  return url;
}

function keepOnlyReleaseDates(raw: YgoCard): YgoCard {
  const { misc_info: miscInfo, ...card } = raw;
  const releaseDates = (miscInfo ?? []).map(({ tcg_date, ocg_date }) => ({
    ...(tcg_date ? { tcg_date } : {}),
    ...(ocg_date ? { ocg_date } : {}),
  }));
  return releaseDates.length > 0 ? { ...card, misc_info: releaseDates } : card;
}

function toArtworkSyncCards(raw: YgoCard): SyncSourceCard[] {
  return (raw.card_images ?? []).map((image) =>
    withRawData(
      {
        id: String(image.id),
        name: raw.name,
        setCode: "",
        imageUrl: image.image_url,
      },
      raw,
    ),
  );
}

function toSyncCards(raw: YgoCard): SyncSourceCard[] {
  const printings = yugiohPrintingsOf(raw);
  if (printings.length === 0) return toArtworkSyncCards(raw);
  const artwork = mainYugiohArtworkOf(raw);
  const prefersLinkedProductImage = hasSeveralYugiohArtworks(raw);

  return printings.map((printing) =>
    withRawData(
      {
        id: yugiohPrintingId(raw, printing),
        name: raw.name,
        setCode: splitSetCode(printing.set_code).set,
        imageUrl: artwork?.image_url,
        ...(prefersLinkedProductImage ? { prefersLinkedProductImage } : {}),
      },
      { ...raw, card_sets: [printing] },
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
  const res = await fetch(cardinfoUrlWithReleaseDates(baseUrl), {
    headers: CARD_API_HEADERS,
    signal,
  });
  if (!res.ok) {
    throw new Error(`YGOPRODeck fetch failed: ${res.status}`);
  }

  const json = (await res.json()) as { data?: YgoCard[] };
  const rows = (json.data ?? []).map(keepOnlyReleaseDates);
  const cards = rows.flatMap(toSyncCards);
  addLog(`Fetched ${rows.length} cards (${cards.length} printings).`);

  return cards;
}

async function fetchOne(id: string, baseUrl: string): Promise<FetchOneResult> {
  const requestUrl = cardinfoUrlWithReleaseDates(baseUrl);
  requestUrl.searchParams.set("id", yugiohPasscodeOf(id));
  const url = String(requestUrl);
  const res = await fetch(url, { headers: CARD_API_HEADERS });
  if (!res.ok) return { card: null, urls: [`${url} [HTTP ${res.status}]`] };

  const json = (await res.json()) as { data?: YgoCard[] };
  const raw = json.data?.[0];
  if (!raw) return { card: null, urls: [url] };

  const cards = toSyncCards(keepOnlyReleaseDates(raw));
  const match = cards.find((card) => card.id === id) ?? cards[0];
  if (!match) return { card: null, urls: [url] };
  const { id: _id, ...card } = match;
  return { card, urls: [url] };
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
