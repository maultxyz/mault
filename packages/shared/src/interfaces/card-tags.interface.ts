import type { CARD_TAGS } from "../constants/card-tags.constant";

export type CardTag = (typeof CARD_TAGS)[number];

export interface CardTagsChangedEvent {
  scanIds: string[];
  tags: CardTag[];
  enabled: boolean;
}

export interface CardTagFlags {
  isDownloaded?: boolean;
  reviewed?: boolean;
  corrected?: boolean;
  lowConfidenceMatch?: boolean;
}
