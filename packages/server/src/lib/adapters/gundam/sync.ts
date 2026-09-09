import { CARD_API_HEADERS } from "../card-search/constants";
import type { SyncSource, SyncSourceCard } from "../card-search/sync-types";
import { GUNDAM_DEFAULT_URL } from "./search";

interface GundamListCard {
  product_id: string;
  card_number: string;
  name: string;
  set_code: string;
  image_url: string;
}

const PAGE_LIMIT = 250;

function extractRows(json: unknown): GundamListCard[] {
  if (Array.isArray(json)) return json as GundamListCard[];
  if (json && typeof json === "object" && Array.isArray((json as { data?: unknown }).data)) {
    return (json as { data: GundamListCard[] }).data;
  }
  return [];
}

async function fetchCards(
  baseUrl: string,
  addLog: (msg: string) => void,
  _lang?: string,
  signal?: AbortSignal,
): Promise<SyncSourceCard[]> {
  addLog("Fetching Gundam Card Game catalog...");

  const all: GundamListCard[] = [];
  let offset = 0;
  for (;;) {
    const url = `${baseUrl}?limit=${PAGE_LIMIT}&offset=${offset}`;
    const res = await fetch(url, { headers: CARD_API_HEADERS, signal });
    if (!res.ok) throw new Error(`Gundam card list fetch failed: ${res.status}`);

    const rows = extractRows(await res.json());
    all.push(...rows);
    addLog(`Fetched ${all.length} cards so far...`);

    if (rows.length < PAGE_LIMIT) break;
    offset += PAGE_LIMIT;
  }

  return all.map((c) => ({
    id: c.product_id ?? c.card_number,
    name: c.name,
    setCode: c.set_code,
    imageUrl: c.image_url,
  }));
}

async function fetchOne(id: string, baseUrl: string) {
  const res = await fetch(`${baseUrl}/${id}`, { headers: CARD_API_HEADERS });
  if (!res.ok) return null;

  const json = await res.json();
  const raw =
    json && typeof json === "object" && "data" in json && (json as { data?: unknown }).data
      ? (json as { data: GundamListCard }).data
      : (json as GundamListCard);

  if (!raw) return null;
  return { name: raw.name, setCode: raw.set_code, imageUrl: raw.image_url };
}

export const gundamSyncSource: SyncSource = {
  gameKey: "gundam",
  label: "Gundam Card Game",
  defaultUrl: GUNDAM_DEFAULT_URL,
  fetchHeaders: CARD_API_HEADERS,
  languages: ["en"],
  fetchCards,
  fetchOne,
};
