import type {
  FetchOneResult,
  SyncSource,
  SyncSourceCard,
} from "../../card-search/sync-types";
import { withRawData } from "../../card-search/with-raw-data";
import { CARD_API_HEADERS } from "../../constants/card-search";
import { RIFTBOUND_DEFAULT_URL } from "../../constants/urls";
import { type RiftboundCard } from "./search";

const SYNC_PAGE_SIZE = 100;

interface RiftboundListResponse {
  items: RiftboundCard[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

function toSyncCard(raw: RiftboundCard): SyncSourceCard {
  return withRawData(
    {
      id: raw.id,
      name: raw.name,
      setCode: raw.set?.set_id ?? "",
      imageUrl: raw.media?.image_url,
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
  const all: SyncSourceCard[] = [];
  let page = 1;
  let pages = 1;

  do {
    const res = await fetch(
      `${baseUrl}?page=${page}&size=${SYNC_PAGE_SIZE}`,
      { headers: CARD_API_HEADERS, signal },
    );
    if (!res.ok) {
      throw new Error(`Riftcodex card list fetch failed: ${res.status}`);
    }

    const data = (await res.json()) as RiftboundListResponse;
    pages = data.pages;
    all.push(...data.items.map(toSyncCard));

    if (page === 1 || page % 5 === 0 || page === pages) {
      addLog(`Fetched page ${page} of ${pages} (${all.length} cards so far)...`);
    }

    page += 1;
  } while (page <= pages && !signal?.aborted);

  return all;
}

async function fetchOne(id: string, baseUrl: string): Promise<FetchOneResult> {
  const url = `${baseUrl}/${id}`;
  const res = await fetch(url, { headers: CARD_API_HEADERS });
  if (!res.ok) return { card: null, urls: [`${url} [HTTP ${res.status}]`] };

  const raw = (await res.json()) as RiftboundCard;
  return { card: toSyncCard(raw), urls: [url] };
}

export const riftboundSyncSource: SyncSource = {
  gameKey: "riftbound",
  label: "Riftbound (Riftcodex)",
  defaultUrl: RIFTBOUND_DEFAULT_URL,
  fetchHeaders: CARD_API_HEADERS,
  languages: ["en"],
  fetchCards,
  fetchOne,
};
