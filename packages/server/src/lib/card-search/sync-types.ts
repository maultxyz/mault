export interface SyncSourceCard {
  id: string;
  name: string;
  setCode: string;
  imageUrl: string | undefined;
}

export interface SyncSourceCardDetail {
  name: string;
  setCode: string;
  imageUrl: string | undefined;
}

// `urls` is every request fetchOne actually made while looking for the card
// - one entry for a direct by-id lookup, several for an adapter (onepiece,
// fab) that has to page through a listing since the source has no direct
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
