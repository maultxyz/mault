import { CARD_API_HEADERS } from "../card-search/constants";
import type {
  SyncSource,
  SyncSourceCard,
  SyncSourceCardDetail,
} from "../card-search/sync-types";
import {
  LORCANA_DE_API_ROOT,
  LORCANA_DEFAULT_URL,
  type LorcanaDeCard,
  type LorcastCard,
  lorcanaCardId,
  lorcanaCardName,
  lorcanaDeCardName,
  parseLorcanaCardId,
} from "./search";

interface LorcastSet {
  id: string;
  code: string;
  name: string;
}

interface LorcanaDeSet {
  code: string;
  name: string;
}

function toSyncCardDe(raw: LorcanaDeCard): SyncSourceCard {
  return {
    id: String(raw.id),
    name: lorcanaDeCardName(raw),
    setCode: raw.setCode,
    imageUrl: raw.images?.full ?? raw.images?.thumbnail,
  };
}

async function fetchGermanCards(
  addLog: (msg: string) => void,
  signal?: AbortSignal,
): Promise<SyncSourceCard[]> {
  addLog("Fetching Lorcana DE set list...");
  const setsRes = await fetch(`${LORCANA_DE_API_ROOT}/sets`, {
    headers: CARD_API_HEADERS,
    signal,
  });
  if (!setsRes.ok)
    throw new Error(`Lorcana DE set list fetch failed: ${setsRes.status}`);
  const setsData = (await setsRes.json()) as { sets: LorcanaDeSet[] };

  const all: SyncSourceCard[] = [];
  for (const set of setsData.sets) {
    if (signal?.aborted) break;

    let page = 1;
    let pages = 1;
    let setCount = 0;
    do {
      const res = await fetch(
        `${LORCANA_DE_API_ROOT}/sets/${set.code}/cards?limit=250&page=${page}`,
        { headers: CARD_API_HEADERS, signal },
      );
      if (!res.ok) {
        addLog(`Failed to fetch ${set.name}: ${res.status}`);
        break;
      }

      const data = (await res.json()) as {
        pages: number;
        cards: LorcanaDeCard[];
      };
      pages = data.pages;
      setCount += data.cards.length;
      all.push(...data.cards.map(toSyncCardDe));
      page += 1;
    } while (page <= pages && !signal?.aborted);

    addLog(
      `Fetched ${set.name}: ${setCount} cards (${all.length} total so far)...`,
    );
  }

  return all;
}

async function fetchOneDe(id: string): Promise<SyncSourceCardDetail | null> {
  const res = await fetch(`${LORCANA_DE_API_ROOT}/cards/${id}`, {
    headers: CARD_API_HEADERS,
  });
  if (!res.ok) return null;

  const raw = (await res.json()) as LorcanaDeCard;
  return {
    name: lorcanaDeCardName(raw),
    setCode: raw.setCode,
    imageUrl: raw.images?.full ?? raw.images?.thumbnail,
  };
}

function apiRoot(baseUrl: string): string {
  try {
    return new URL(baseUrl).href.replace(/\/cards\/?$/, "");
  } catch {
    return new URL(LORCANA_DEFAULT_URL).href.replace(/\/cards\/?$/, "");
  }
}

function toSyncCard(raw: LorcastCard): SyncSourceCard {
  const image = raw.image_uris?.digital;
  return {
    id: lorcanaCardId(raw.set.code, raw.collector_number),
    name: lorcanaCardName(raw),
    setCode: raw.set.code,
    imageUrl: image?.large ?? image?.normal,
  };
}

async function fetchCards(
  baseUrl: string,
  addLog: (msg: string) => void,
  lang: string = "en",
  signal?: AbortSignal,
): Promise<SyncSourceCard[]> {
  if (lang === "de") return fetchGermanCards(addLog, signal);

  const root = apiRoot(baseUrl);

  addLog("Fetching Lorcast set list...");
  const setsRes = await fetch(`${root}/sets`, {
    headers: CARD_API_HEADERS,
    signal,
  });
  if (!setsRes.ok)
    throw new Error(`Lorcast set list fetch failed: ${setsRes.status}`);
  const setsData = (await setsRes.json()) as { results: LorcastSet[] };

  const all: SyncSourceCard[] = [];
  for (const set of setsData.results) {
    if (signal?.aborted) break;

    const res = await fetch(`${root}/sets/${set.code}/cards`, {
      headers: CARD_API_HEADERS,
      signal,
    });
    if (!res.ok) {
      addLog(`Failed to fetch ${set.name}: ${res.status}`);
      continue;
    }

    const data = (await res.json()) as LorcastCard[];

    const kept = data.filter((c) => c.lang === lang);
    all.push(...kept.map(toSyncCard));
    addLog(
      `Fetched ${set.name}: ${kept.length} cards (${all.length} total so far)...`,
    );
  }

  return all;
}

async function fetchOne(
  id: string,
  baseUrl: string,
  lang?: string,
): Promise<SyncSourceCardDetail | null> {
  if (lang === "de") return fetchOneDe(id);

  const parsed = parseLorcanaCardId(id);
  if (!parsed) return null;

  const res = await fetch(`${baseUrl}/${parsed.setCode}/${parsed.number}`, {
    headers: CARD_API_HEADERS,
  });
  if (!res.ok) return null;

  const raw = (await res.json()) as LorcastCard;
  return toSyncCard(raw);
}

export const lorcanaSyncSource: SyncSource = {
  gameKey: "lorcana",
  label: "Disney Lorcana (Lorcast / Lorcana DE)",
  defaultUrl: LORCANA_DEFAULT_URL,
  fetchHeaders: CARD_API_HEADERS,
  languages: ["en", "de"],
  fetchCards,
  fetchOne,
};
