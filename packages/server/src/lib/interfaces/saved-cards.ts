import type { PlayingCard } from "@magic-vault/shared";
import type { SQL } from "drizzle-orm";

export interface CatalogSqlColumns {
  setName: SQL;
  rarity: SQL;
  colorIdentity: SQL;
  searchText: SQL;
  imageSmall: SQL;
  data: SQL;
}

export interface CatalogJoinScope {
  gameKey: string | null | SQL;
  lang: string | SQL;
}

export interface CardCatalogColumns {
  setName: string | null;
  rarity: string | null;
  colorIdentity: string[];
  searchText: string | null;
  imageSmall: string | null;
}

export interface CatalogCardKey {
  gameKey: string;
  lang: string;
  cardId: string;
}

export interface SavedCollectionCardRow {
  id: number;
  card: PlayingCard;
  alternative_matches: PlayingCard[] | null;
  game_key: string | null;
  lang: string;
}

export interface SavedCardScope {
  gameKey: string | null;
  lang: string;
}

export interface SavedCardItem<T extends PlayingCard = PlayingCard>
  extends SavedCardScope {
  card: T;
}

export interface SavedScanFields {
  card: PlayingCard;
  alternativeMatches?: PlayingCard[] | null;
}

export interface SavedCardHydrateOptions {
  includeRaw: boolean;
}

export interface SavedCardSnapshots<
  TCard extends PlayingCard,
  TAlternative extends PlayingCard,
> {
  card: TCard;
  alternativeMatches: TAlternative[] | null;
}
