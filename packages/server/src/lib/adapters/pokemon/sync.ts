import { CARD_API_HEADERS } from "../card-search/constants";
import type { SyncSource, SyncSourceCard } from "../card-search/sync-types";
import { POKEMON_DEFAULT_URL } from "./search";

interface PokemonListCard {
  id: string;
  localId: string;
  name: string;
  image?: string;
}

interface PokemonDetailCard extends PokemonListCard {
  set?: { id: string };
}

const PAGE_LIMIT = 1000;

function highResUrl(image: string | undefined): string | undefined {
  return image ? `${image}/high.webp` : undefined;
}

function localizedUrl(baseUrl: string, lang?: string): string {
  if (!lang) return baseUrl;
  return baseUrl.replace(/\/v2\/[^/]+\//, `/v2/${lang}/`);
}

async function fetchCards(
  baseUrl: string,
  addLog: (msg: string) => void,
  lang?: string,
  signal?: AbortSignal,
): Promise<SyncSourceCard[]> {
  addLog("Fetching Pokémon TCG catalog...");

  const listUrl = localizedUrl(baseUrl, lang);
  const all: PokemonListCard[] = [];
  let page = 1;
  for (;;) {
    const url = `${listUrl}?pagination:page=${page}&pagination:itemsPerPage=${PAGE_LIMIT}`;
    const res = await fetch(url, { headers: CARD_API_HEADERS, signal });
    if (!res.ok)
      throw new Error(`Pokémon card list fetch failed: ${res.status}`);

    const rows = (await res.json()) as PokemonListCard[];
    all.push(...rows);
    addLog(`Fetched ${all.length} cards so far...`);

    if (rows.length < PAGE_LIMIT) break;
    page += 1;
  }

  return all.map((c) => ({
    id: c.id,
    name: c.name,
    setCode: c.id.split("-")[0] ?? "",
    imageUrl: highResUrl(c.image),
  }));
}

async function fetchOne(id: string, baseUrl: string) {
  const res = await fetch(`${baseUrl}/${id}`, { headers: CARD_API_HEADERS });
  if (!res.ok) return null;

  const raw = (await res.json()) as PokemonDetailCard;
  if (!raw) return null;

  return {
    name: raw.name,
    setCode: raw.set?.id ?? raw.id.split("-")[0] ?? "",
    imageUrl: highResUrl(raw.image),
  };
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
