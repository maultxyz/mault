import type { PlayingCard } from "@magic-vault/shared";
import {
  catalogCardKey,
  findCatalogCardKeys,
  loadCatalogCards,
} from "./card-catalog";
import {
  SAVED_ALTERNATIVE_KEYS,
  SAVED_CARD_READ_TIME_KEYS,
  SAVED_CARD_SCAN_KEYS,
} from "./constants/saved-cards";
import type {
  CatalogCardKey,
  SavedCardHydrateOptions,
  SavedCardItem,
  SavedCardScope,
  SavedCardSnapshots,
  SavedScanFields,
} from "./interfaces/saved-cards";

function withoutKeys<T extends object>(value: T, keys: readonly string[]): T {
  const copy = { ...value } as Record<string, unknown>;
  for (const key of keys) delete copy[key];
  return copy as T;
}

function onlyKeys<T extends object>(value: T, keys: readonly string[]): T {
  const source = value as Record<string, unknown>;
  return Object.fromEntries(
    keys.flatMap((key) => (source[key] === undefined ? [] : [[key, source[key]]])),
  ) as T;
}

function catalogKeyFor(
  scope: SavedCardScope,
  card: PlayingCard | null | undefined,
): CatalogCardKey | null {
  if (!scope.gameKey || !card?.id) return null;
  return { gameKey: scope.gameKey, lang: card.lang ?? scope.lang, cardId: card.id };
}

function lookupKey(scope: SavedCardScope, card: PlayingCard): string | null {
  const key = catalogKeyFor(scope, card);
  return key ? catalogCardKey(key) : null;
}

export function withCatalogCard<T extends PlayingCard>(
  saved: T,
  current: PlayingCard | undefined,
  { includeRaw }: SavedCardHydrateOptions,
): T {
  if (!current) return includeRaw ? saved : withoutKeys(saved, ["raw"]);
  const merged = {
    ...withoutKeys(current, ["raw"]),
    ...withoutKeys(saved, ["raw"]),
    ...withoutKeys(current, [...SAVED_CARD_SCAN_KEYS, "raw"]),
    image: current.image?.normal ? current.image : saved.image,
  };
  return (includeRaw ? { ...merged, raw: current.raw } : merged) as T;
}

export async function hydrateSavedCards<T extends PlayingCard>(
  items: SavedCardItem<T>[],
  options: SavedCardHydrateOptions,
): Promise<T[]> {
  const keys = items.flatMap((item) => catalogKeyFor(item, item.card) ?? []);
  const catalog = keys.length > 0 ? await loadCatalogCards(keys) : new Map();
  return items.map((item) => {
    const key = lookupKey(item, item.card);
    return withCatalogCard(item.card, key ? catalog.get(key) : undefined, options);
  });
}

export async function hydrateSavedScans<T extends SavedScanFields>(
  scope: SavedCardScope,
  scans: T[],
  options: SavedCardHydrateOptions,
): Promise<T[]> {
  const keys = scans.flatMap((scan) =>
    [scan.card, ...(scan.alternativeMatches ?? [])].flatMap(
      (card) => catalogKeyFor(scope, card) ?? [],
    ),
  );
  if (keys.length === 0) return scans;
  const catalog = await loadCatalogCards(keys);
  const hydrate = <C extends PlayingCard>(card: C): C => {
    const key = lookupKey(scope, card);
    return withCatalogCard(card, key ? catalog.get(key) : undefined, options);
  };
  return scans.map((scan) => ({
    ...scan,
    card: scan.card ? hydrate(scan.card) : scan.card,
    alternativeMatches: scan.alternativeMatches?.map(hydrate) ?? scan.alternativeMatches,
  }));
}

export async function hydrateSavedScan<T extends SavedScanFields>(
  scope: SavedCardScope,
  scan: T,
  options: SavedCardHydrateOptions,
): Promise<T> {
  const [hydrated] = await hydrateSavedScans(scope, [scan], options);
  return hydrated;
}

export function savedCardCatalogKeys(
  scope: SavedCardScope,
  card: PlayingCard,
  alternativeMatches: PlayingCard[] | null | undefined,
): CatalogCardKey[] {
  return [card, ...(alternativeMatches ?? [])].flatMap(
    (entry) => catalogKeyFor(scope, entry) ?? [],
  );
}

export function slimSavedCardSnapshots<
  TCard extends PlayingCard,
  TAlternative extends PlayingCard,
>(
  scope: SavedCardScope,
  card: TCard,
  alternativeMatches: TAlternative[] | null | undefined,
  inCatalog: Set<string>,
): SavedCardSnapshots<TCard, TAlternative> {
  const alternatives = alternativeMatches?.length ? alternativeMatches : null;
  const isInCatalog = (entry: PlayingCard) => {
    const key = lookupKey(scope, entry);
    return !!key && inCatalog.has(key);
  };
  const readTimeKeys = SAVED_CARD_READ_TIME_KEYS.filter((key) => key !== "raw");
  return {
    card: withoutKeys(
      card,
      isInCatalog(card) ? SAVED_CARD_READ_TIME_KEYS : readTimeKeys,
    ),
    alternativeMatches:
      alternatives?.map((alternative) =>
        isInCatalog(alternative)
          ? onlyKeys(alternative, SAVED_ALTERNATIVE_KEYS)
          : withoutKeys(alternative, readTimeKeys),
      ) ?? null,
  };
}

export async function toSavedCardSnapshots<
  TCard extends PlayingCard,
  TAlternative extends PlayingCard,
>(
  scope: SavedCardScope,
  card: TCard,
  alternativeMatches: TAlternative[] | null | undefined,
): Promise<SavedCardSnapshots<TCard, TAlternative>> {
  const keys = savedCardCatalogKeys(scope, card, alternativeMatches);
  const inCatalog = keys.length > 0 ? await findCatalogCardKeys(keys) : new Set<string>();
  return slimSavedCardSnapshots(scope, card, alternativeMatches, inCatalog);
}
