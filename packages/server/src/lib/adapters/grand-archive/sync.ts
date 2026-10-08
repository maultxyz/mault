import type {
  FetchOneResult,
  SyncSource,
  SyncSourceCard,
} from "../../interfaces/card-search";
import { withRawData } from "../../card-search/with-raw-data";
import { CARD_API_HEADERS } from "../../constants/card-search";
import { GRAND_ARCHIVE_SYNC_PAGE_SIZE } from "../../constants/sync";
import {
  GRAND_ARCHIVE_API_ROOT,
  GRAND_ARCHIVE_DEFAULT_URL,
} from "../../constants/urls";
import type {
  GrandArchiveCard,
  GrandArchiveEdition,
  GrandArchiveSearchResponse,
} from "../../interfaces/grand-archive";
import {
  fetchCardByEditionSlug,
  findGrandArchiveEdition,
  grandArchiveSearchUrl,
} from "./search";

function toSyncCard(
  card: GrandArchiveCard,
  edition: GrandArchiveEdition,
): SyncSourceCard {
  return withRawData(
    {
      id: edition.slug,
      name: card.name,
      setCode: edition.set.prefix,
      imageUrl: edition.image
        ? `${GRAND_ARCHIVE_API_ROOT}${edition.image}`
        : undefined,
    },
    card,
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
      grandArchiveSearchUrl(baseUrl, {
        page,
        page_size: GRAND_ARCHIVE_SYNC_PAGE_SIZE,
      }),
      { headers: CARD_API_HEADERS, signal },
    );
    if (!res.ok) {
      throw new Error(`Grand Archive card list fetch failed: ${res.status}`);
    }

    const json = (await res.json()) as GrandArchiveSearchResponse;
    pages = json.total_pages;
    for (const card of json.data) {
      all.push(...card.editions.map((edition) => toSyncCard(card, edition)));
    }

    if (page === 1 || page % 10 === 0 || page === pages) {
      addLog(
        `Fetched page ${page} of ${pages} (${all.length} cards so far)...`,
      );
    }

    page += 1;
  } while (page <= pages && !signal?.aborted);

  return all;
}

async function fetchOne(id: string, baseUrl: string): Promise<FetchOneResult> {
  const { card, url, status } = await fetchCardByEditionSlug(id, baseUrl);
  const urls = [`${url} [HTTP ${status}]`];
  const edition = card && findGrandArchiveEdition(card, id);
  if (!card || !edition) return { card: null, urls };
  return { card: toSyncCard(card, edition), urls };
}

export const grandArchiveSyncSource: SyncSource = {
  gameKey: "grandarchive",
  label: "Grand Archive (gatcg.com)",
  defaultUrl: GRAND_ARCHIVE_DEFAULT_URL,
  fetchHeaders: CARD_API_HEADERS,
  languages: ["en"],
  fetchCards,
  fetchOne,
};
