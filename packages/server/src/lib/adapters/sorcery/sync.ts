import { fetchCardApi } from "../../card-search/fetch";
import { withRawData } from "../../card-search/with-raw-data";
import { CARD_API_HEADERS } from "../../constants/card-search";
import {
  SORCERY_PRINTING_FINISH_SUFFIX_PATTERN,
  SORCERY_STANDARD_FINISH,
} from "../../constants/sorcery";
import { SORCERY_DEFAULT_URL } from "../../constants/urls";
import type {
  FetchOneResult,
  SyncSource,
  SyncSourceCard,
} from "../../interfaces/card-search";
import type { SorceryCard, SorceryPrinting } from "../../interfaces/sorcery";

export function sorceryArtworkId(printing: SorceryPrinting): string {
  return printing.slug.replace(SORCERY_PRINTING_FINISH_SUFFIX_PATTERN, "");
}

export function splitSorceryArtworks(card: SorceryCard): SorceryCard[] {
  const printingsByArtwork = new Map<string, SorceryPrinting[]>();
  for (const printing of card.printings) {
    const artworkId = sorceryArtworkId(printing);
    printingsByArtwork.set(artworkId, [
      ...(printingsByArtwork.get(artworkId) ?? []),
      printing,
    ]);
  }
  return [...printingsByArtwork.values()].map((printings) => ({
    ...card,
    printings: [...printings].sort(
      (a, b) =>
        Number(b.meta.finish === SORCERY_STANDARD_FINISH) -
        Number(a.meta.finish === SORCERY_STANDARD_FINISH),
    ),
  }));
}

function toSyncCard(artwork: SorceryCard): SyncSourceCard {
  const printing = artwork.printings[0];
  return withRawData(
    {
      id: sorceryArtworkId(printing),
      name: artwork.name,
      setCode: printing.set.code,
      imageUrl: undefined,
    },
    artwork,
  );
}

async function fetchAllCards(
  baseUrl: string,
  signal?: AbortSignal,
): Promise<SorceryCard[]> {
  const response = await fetchCardApi(baseUrl, { headers: CARD_API_HEADERS, signal });
  if (!response.ok) {
    throw new Error(`Sorcery card list fetch failed: HTTP ${response.status}`);
  }
  return (await response.json()) as SorceryCard[];
}

async function fetchCards(
  baseUrl: string,
  addLog: (msg: string) => void,
  _lang?: string,
  signal?: AbortSignal,
): Promise<SyncSourceCard[]> {
  const cards = await fetchAllCards(baseUrl, signal);
  const artworks = cards.flatMap(splitSorceryArtworks).map(toSyncCard);
  addLog(`Fetched ${cards.length} Sorcery cards (${artworks.length} artworks).`);
  return artworks;
}

async function fetchOne(id: string, baseUrl: string): Promise<FetchOneResult> {
  const artwork = (await fetchAllCards(baseUrl))
    .flatMap(splitSorceryArtworks)
    .find((candidate) => sorceryArtworkId(candidate.printings[0]) === id);
  if (!artwork) return { card: null, urls: [baseUrl] };
  const { id: _id, ...card } = toSyncCard(artwork);
  return { card, urls: [baseUrl] };
}

export const sorcerySyncSource: SyncSource = {
  gameKey: "sorcery",
  label: "Sorcery: Contested Realm",
  defaultUrl: SORCERY_DEFAULT_URL,
  fetchHeaders: CARD_API_HEADERS,
  languages: ["en"],
  fetchCards,
  fetchOne,
};
