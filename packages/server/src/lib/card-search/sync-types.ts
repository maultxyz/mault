// `data` is the source API's own card object, stored untouched in
// `cards.data` and normalized on read (CardSearchAdapter.normalizeStored).
// It's pre-serialized since a full catalog (100k+ Scryfall printings) held as
// parsed objects until the insert phase takes several times the memory.
export interface SyncSourceCard {
  id: string;
  name: string;
  setCode: string;
  imageUrl: string | undefined;
  data: string;
}

export type SyncSourceCardDetail = Omit<SyncSourceCard, "id">;

export function withRawData<T extends object>(
  card: T,
  raw: unknown,
): T & { data: string } {
  return { ...card, data: JSON.stringify(raw) };
}

// `urls` is every request fetchOne actually made while looking for the card
// - one entry for a direct by-id lookup, several for an adapter (onepiece)
// that has to page through a listing since the source has no direct
// by-id endpoint at this granularity. Populated whether or not `card` was
// found, so a caller can report exactly what was queried on a miss.
export interface FetchOneResult {
  card: SyncSourceCardDetail | null;
  urls: string[];
}

export interface SyncSource {
  gameKey: string;
  label: string;
  defaultUrl: string;
  fetchHeaders: Record<string, string>;
  languages: string[];
  fetchCards(
    baseUrl: string,
    addLog: (msg: string) => void,
    lang?: string,
    signal?: AbortSignal,
  ): Promise<SyncSourceCard[]>;
  fetchOne(id: string, baseUrl: string, lang?: string): Promise<FetchOneResult>;
}
