import { createInterface } from "node:readline";
import { Readable } from "node:stream";
import type { ReadableStream as NodeWebReadableStream } from "node:stream/web";
import { createGunzip } from "node:zlib";
import { CARD_API_HEADERS } from "../card-search/constants";
import type { SyncSource, SyncSourceCard } from "../card-search/sync-types";
import { SCRYFALL_DEFAULT_URL } from "./search";

type ScryfallBulkCard = {
  id: string;
  name: string;
  printed_name?: string;
  lang: string;
  set: string;
  image_uris?: { png?: string; large?: string };
};

function apiRoot(baseUrl: string): string {
  try {
    return new URL(baseUrl).origin;
  } catch {
    return new URL(SCRYFALL_DEFAULT_URL).origin;
  }
}

async function downloadBulkData(
  baseUrl: string,
  addLog: (msg: string) => void,
  bulkType: string,
  lang: string | undefined,
  signal?: AbortSignal,
): Promise<SyncSourceCard[]> {
  addLog("Fetching Scryfall bulk data catalog...");

  const catalogRes = await fetch(`${apiRoot(baseUrl)}/bulk-data`, {
    headers: CARD_API_HEADERS,
    signal,
  });
  if (!catalogRes.ok) {
    throw new Error(`Scryfall catalog fetch failed: ${catalogRes.status}`);
  }
  const catalog = (await catalogRes.json()) as {
    data: { type: string; jsonl_download_uri: string }[];
  };

  const entry = catalog.data.find((e) => e.type === bulkType);
  if (!entry) throw new Error(`Could not find ${bulkType} bulk data entry`);

  addLog(`Downloading bulk "${bulkType}" data...`);

  const bulkRes = await fetch(entry.jsonl_download_uri, {
    headers: CARD_API_HEADERS,
    signal,
  });
  if (!bulkRes.ok || !bulkRes.body)
    throw new Error(`Bulk data download failed: ${bulkRes.status}`);

  const cards: SyncSourceCard[] = [];
  let seen = 0;
  const lines = createInterface({
    input: Readable.fromWeb(
      bulkRes.body as NodeWebReadableStream<Uint8Array>,
    ).pipe(createGunzip()),
    crlfDelay: Infinity,
  });

  for await (const line of lines) {
    if (!line) continue;
    seen++;
    const raw = JSON.parse(line) as ScryfallBulkCard;
    if (lang && raw.lang !== lang) continue;
    cards.push({
      id: raw.id,
      name: raw.printed_name ?? raw.name,
      setCode: raw.set,
      imageUrl: raw.image_uris?.png ?? raw.image_uris?.large,
    });
  }

  addLog(`Scanned ${seen} cards, kept ${cards.length}.`);

  return cards;
}

async function fetchCards(
  baseUrl: string,
  addLog: (msg: string) => void,
  lang: string = "en",
  signal?: AbortSignal,
): Promise<SyncSourceCard[]> {
  return lang === "en"
    ? downloadBulkData(baseUrl, addLog, "unique_artwork", undefined, signal)
    : downloadBulkData(baseUrl, addLog, "all_cards", lang, signal);
}

async function fetchOne(id: string, baseUrl: string) {
  const res = await fetch(`${baseUrl}/${id}`, { headers: CARD_API_HEADERS });
  if (!res.ok) return null;
  const card = (await res.json()) as {
    name: string;
    set: string;
    image_uris?: { png?: string; large?: string };
  };
  return {
    name: card.name,
    setCode: card.set,
    imageUrl: card.image_uris?.png ?? card.image_uris?.large,
  };
}

export const scryfallSyncSource: SyncSource = {
  gameKey: "mtg",
  label: "Magic: The Gathering (Scryfall)",
  defaultUrl: SCRYFALL_DEFAULT_URL,
  fetchHeaders: CARD_API_HEADERS,
  languages: [
    "en",
    "es",
    "fr",
    "de",
    "it",
    "pt",
    "ja",
    "lo",
    "ru",
    "zhs",
    "zht",
  ],
  fetchCards,
  fetchOne,
};
