import type {
  FetchOneResult,
  SyncSource,
  SyncSourceCard,
} from "../../card-search/sync-types";
import { withRawData } from "../../card-search/with-raw-data";
import { CARD_API_HEADERS } from "../../constants/card-search";
import { SWU_API_ROOT, SWU_DEFAULT_URL } from "../../constants/urls";
import type { SwuCard, SwuCardList, SwuSet } from "../../interfaces/swu";
import {
  isSwuFoilVariant,
  parseSwuCardId,
  swuCardId,
  swuCardName,
} from "./search";

function toSyncCard(raw: SwuCard): SyncSourceCard {
  return withRawData(
    {
      id: swuCardId(raw.Set, raw.Number),
      name: swuCardName(raw),
      setCode: raw.Set,
      imageUrl: raw.FrontArt,
    },
    raw,
  );
}

async function fetchCards(
  baseUrl: string,
  addLog: (msg: string) => void,
  _lang?: string,
  signal?: AbortSignal,
): Promise<SyncSourceCard[]> {
  addLog("Fetching SWU-DB set list...");
  const setsRes = await fetch(`${SWU_API_ROOT}/sets`, {
    headers: CARD_API_HEADERS,
    signal,
  });
  if (!setsRes.ok) {
    throw new Error(`SWU-DB set list fetch failed: ${setsRes.status}`);
  }
  const sets = (await setsRes.json()) as SwuSet[];

  const all: SyncSourceCard[] = [];
  const seen = new Set<string>();
  for (const set of sets) {
    if (signal?.aborted) break;

    const res = await fetch(`${baseUrl}/${set.setId}`, {
      headers: CARD_API_HEADERS,
      signal,
    });
    if (!res.ok) {
      addLog(`Failed to fetch ${set.fullName}: ${res.status}`);
      continue;
    }

    const list = (await res.json()) as SwuCardList;
    let kept = 0;
    for (const card of list.data) {
      if (isSwuFoilVariant(card) || !card.FrontArt) continue;
      const synced = toSyncCard(card);
      if (seen.has(synced.id)) continue;
      seen.add(synced.id);
      all.push(synced);
      kept += 1;
    }
    addLog(
      `Fetched ${set.fullName}: ${kept} cards (${all.length} total so far)...`,
    );
  }

  return all;
}

async function fetchOne(id: string, baseUrl: string): Promise<FetchOneResult> {
  const parsed = parseSwuCardId(id);
  if (!parsed) return { card: null, urls: [] };

  const url = `${baseUrl}/${parsed.set}/${parsed.number}`;
  const res = await fetch(url, { headers: CARD_API_HEADERS });
  if (!res.ok) return { card: null, urls: [`${url} [HTTP ${res.status}]`] };

  const raw = (await res.json()) as SwuCard;
  return { card: toSyncCard(raw), urls: [url] };
}

export const swuSyncSource: SyncSource = {
  gameKey: "swu",
  label: "Star Wars: Unlimited (SWU-DB)",
  defaultUrl: SWU_DEFAULT_URL,
  fetchHeaders: CARD_API_HEADERS,
  languages: ["en"],
  fetchCards,
  fetchOne,
};
