import {
  withRawData,
  type SyncSource,
  type SyncSourceCard,
} from "../../card-search/sync-types";
import { CARD_API_HEADERS } from "../../constants/card-search";
import { POKEMON_DEFAULT_URL } from "../../constants/urls";
import {
  fetchDetail,
  type PokemonCardBrief,
  type PokemonCardDetail,
} from "./search";

const PAGE_LIMIT = 1000;
const DETAIL_CONCURRENCY = 8;
const DETAIL_LOG_EVERY = 1000;

function highResUrl(image: string | undefined): string | undefined {
  return image ? `${image}/high.webp` : undefined;
}

function localizedUrl(baseUrl: string, lang?: string): string {
  if (!lang) return baseUrl;
  return baseUrl.replace(/\/v2\/[^/]+\//, `/v2/${lang}/`);
}

function toSyncCard(raw: PokemonCardBrief | PokemonCardDetail): SyncSourceCard {
  const setCode =
    ("set" in raw ? raw.set?.id : undefined) ?? raw.id.split("-")[0] ?? "";
  return withRawData(
    { id: raw.id, name: raw.name, setCode, imageUrl: highResUrl(raw.image) },
    raw,
  );
}

// TCGdex's list endpoint only has {id, localId, name, image}, so storing a
// full card means one detail request per card. A card whose detail request
// fails twice is stored as its brief listing object instead of being dropped.
async function fetchDetails(
  briefs: PokemonCardBrief[],
  baseUrl: string,
  addLog: (msg: string) => void,
  signal?: AbortSignal,
): Promise<SyncSourceCard[]> {
  addLog(`Fetching full details for ${briefs.length} cards...`);

  const results: SyncSourceCard[] = new Array(briefs.length);
  let next = 0;
  let done = 0;
  let fellBack = 0;

  async function worker(): Promise<void> {
    while (next < briefs.length && !signal?.aborted) {
      const index = next++;
      const brief = briefs[index];
      const detail =
        (await fetchDetail(brief.id, baseUrl, signal).catch(() => null)) ??
        (await fetchDetail(brief.id, baseUrl, signal).catch(() => null));
      if (!detail) fellBack++;

      results[index] = toSyncCard(detail ?? brief);

      done++;
      if (done % DETAIL_LOG_EVERY === 0) {
        addLog(`Fetched details for ${done}/${briefs.length} cards...`);
      }
    }
  }

  await Promise.all(Array.from({ length: DETAIL_CONCURRENCY }, worker));
  if (signal?.aborted) throw new Error("Pokémon detail fetch aborted");

  if (fellBack > 0) {
    addLog(
      `${fellBack} cards' details could not be fetched; stored their brief listing instead.`,
    );
  }
  return results;
}

async function fetchCards(
  baseUrl: string,
  addLog: (msg: string) => void,
  lang?: string,
  signal?: AbortSignal,
): Promise<SyncSourceCard[]> {
  addLog("Fetching Pokémon TCG catalog...");

  const listUrl = localizedUrl(baseUrl, lang);
  const all: PokemonCardBrief[] = [];
  let page = 1;
  for (;;) {
    const url = `${listUrl}?pagination:page=${page}&pagination:itemsPerPage=${PAGE_LIMIT}`;
    const res = await fetch(url, { headers: CARD_API_HEADERS, signal });
    if (!res.ok)
      throw new Error(`Pokémon card list fetch failed: ${res.status}`);

    const rows = (await res.json()) as PokemonCardBrief[];
    all.push(...rows);
    addLog(`Fetched ${all.length} cards so far...`);

    if (rows.length < PAGE_LIMIT) break;
    page += 1;
  }

  return fetchDetails(all, listUrl, addLog, signal);
}

async function fetchOne(id: string, baseUrl: string, lang?: string) {
  const url = `${localizedUrl(baseUrl, lang)}/${id}`;
  const raw = await fetchDetail(id, localizedUrl(baseUrl, lang));
  if (!raw) return { card: null, urls: [url] };
  return { card: toSyncCard(raw), urls: [url] };
}

export const pokemonSyncSource: SyncSource = {
  gameKey: "pokemon",
  label: "Pokémon (TCGdex)",
  defaultUrl: POKEMON_DEFAULT_URL,
  fetchHeaders: CARD_API_HEADERS,
  languages: [
    "en",
    "fr",
    "es",
    "it",
    "pt",
    "pt-br",
    "pt-pt",
    "de",
    "nl",
    "ru",
    "ja",
    "ko",
    "zh-tw",
    "id",
    "th",
    "zh-cn",
  ],
  fetchCards,
  fetchOne,
};
