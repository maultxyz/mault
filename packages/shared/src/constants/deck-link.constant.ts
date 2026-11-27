import type { DeckLinkSource } from "../interfaces/deck-link.interface";

export const DECK_LINK_SOURCES = ["moxfield", "archidekt"] as const;

export const DECK_LINK_URL_MAX_LENGTH = 500;

export const DECK_LINK_HOSTS_BY_SOURCE: Record<DeckLinkSource, readonly string[]> = {
  moxfield: ["moxfield.com", "www.moxfield.com"],
  archidekt: ["archidekt.com", "www.archidekt.com"],
};

export const DECK_LINK_PATH_PATTERNS_BY_SOURCE: Record<DeckLinkSource, RegExp> = {
  moxfield: /^\/decks\/([A-Za-z0-9_-]+)(?:\/|$)/,
  archidekt: /^\/(?:api\/)?decks\/(\d+)(?:\/|$)/,
};

export const DECK_LINK_SOURCE_LABELS: Record<DeckLinkSource, string> = {
  moxfield: "Moxfield",
  archidekt: "Archidekt",
};
