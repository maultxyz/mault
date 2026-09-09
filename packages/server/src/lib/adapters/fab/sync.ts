import { CARD_API_HEADERS } from "../card-search/constants";
import type { SyncSource, SyncSourceCard } from "../card-search/sync-types";
import { FAB_DEFAULT_URL, findPrinting, type FabCard } from "./search";

const PAGE_LIMIT = 100;

interface FabCardListResponse {
  data: FabCard[];
  total: number;
  limit: number;
  offset: number;
}

function toSyncCards(card: FabCard): SyncSourceCard[] {
  return card.printings.map((printing) => ({
    id: printing.unique_id,
    name: card.name,
    setCode: printing.set_id,
    imageUrl: printing.image_url ?? undefined,
  }));
}

async function fetchCards(
  baseUrl: string,
  addLog: (msg: string) => void,
  _lang?: string,
  signal?: AbortSignal,
): Promise<SyncSourceCard[]> {
  addLog("Fetching Flesh and Blood catalog...");

  const all: SyncSourceCard[] = [];
  let offset = 0;
  for (;;) {
    const url = `${baseUrl}?limit=${PAGE_LIMIT}&offset=${offset}`;
    const res = await fetch(url, { headers: CARD_API_HEADERS, signal });
    if (!res.ok)
      throw new Error(`Flesh and Blood card list fetch failed: ${res.status}`);

    const json = (await res.json()) as FabCardListResponse;
    for (const card of json.data) all.push(...toSyncCards(card));
    addLog(`Fetched ${all.length} printings so far...`);

    offset += PAGE_LIMIT;
    if (offset >= json.total || json.data.length === 0) break;
  }

  return all;
}

async function fetchOne(id: string, baseUrl: string) {
  const match = await findPrinting(id, baseUrl);
  if (!match) return null;
  return {
    name: match.card.name,
    setCode: match.printing.set_id,
    imageUrl: match.printing.image_url ?? undefined,
  };
}

export const fabSyncSource: SyncSource = {
  gameKey: "fab",
  label: "Flesh and Blood (goagain.dev)",
  defaultUrl: FAB_DEFAULT_URL,
  fetchHeaders: CARD_API_HEADERS,
  languages: ["en"],
  fetchCards,
  fetchOne,
};
