import {
  DECK_LINK_HOSTS_BY_SOURCE,
  DECK_LINK_PATH_PATTERNS_BY_SOURCE,
  DECK_LINK_SOURCES,
} from "./constants/deck-link.constant";
import type { DeckLinkReference } from "./interfaces/deck-link.interface";

export function parseDeckLinkUrl(value: string): DeckLinkReference | null {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const hostname = url.hostname.toLowerCase();
  for (const source of DECK_LINK_SOURCES) {
    if (!DECK_LINK_HOSTS_BY_SOURCE[source].includes(hostname)) continue;
    const deckId = DECK_LINK_PATH_PATTERNS_BY_SOURCE[source].exec(url.pathname)?.[1];
    return deckId ? { source, deckId } : null;
  }
  return null;
}

export function deckLinkUrl({ source, deckId }: DeckLinkReference): string {
  return `https://${DECK_LINK_HOSTS_BY_SOURCE[source][0]}/decks/${deckId}`;
}
