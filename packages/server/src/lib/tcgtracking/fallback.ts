import type { PlayingCard } from "@magic-vault/shared";
import {
  TCGTRACKING_EXT_KEYS,
  TCGTRACKING_FALLBACK_SOURCE,
  TCGTRACKING_TYPE_LINE_SEPARATOR,
} from "../constants/tcgtracking";
import type { SyncSourceCard } from "../interfaces/card-search";
import type {
  TcgtrackingCatalogEntry,
  TcgtrackingCatalogSet,
  TcgtrackingFallbackData,
  TcgtrackingGameConfig,
  TcgtrackingPrimarySet,
} from "../interfaces/tcgtracking";
import { tcgtrackingCardImage, tcgtrackingFallbackId } from "./catalog";
import { printedCollectorNumber } from "./keys";

export function isTcgtrackingFallbackData(
  data: unknown,
): data is TcgtrackingFallbackData {
  return (
    typeof data === "object" &&
    data !== null &&
    (data as { source?: unknown }).source === TCGTRACKING_FALLBACK_SOURCE
  );
}

export function extValues(
  ext: Record<string, unknown>,
  keys: readonly string[],
): string[] {
  for (const key of keys) {
    const value = ext[key];
    if (Array.isArray(value)) {
      const values = value.filter(
        (item): item is string => typeof item === "string" && !!item,
      );
      if (values.length) return values;
    }
    if (typeof value === "string" && value.trim()) {
      return value.split(/\s*[,/;]\s*/).filter(Boolean);
    }
  }
  return [];
}

export function extText(
  ext: Record<string, unknown>,
  keys: readonly string[],
): string | undefined {
  for (const key of keys) {
    const value = ext[key];
    if (Array.isArray(value) && value.length) return value.join(" ");
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

export function fallbackTcgtrackingSet(
  data: TcgtrackingFallbackData,
): TcgtrackingCatalogSet {
  return data.tcgtrackingSet ?? (data.set as TcgtrackingCatalogSet);
}

function fallbackSetCode(
  set: TcgtrackingCatalogSet,
  primarySetCode: string | undefined,
): string {
  return primarySetCode ?? set.abbreviation ?? String(set.id);
}

export function normalizeTcgtrackingFallback(
  data: TcgtrackingFallbackData,
  id: string,
  config: TcgtrackingGameConfig,
): PlayingCard {
  const ext = data.product.ext_data ?? {};
  const type = extText(ext, TCGTRACKING_EXT_KEYS.type);
  const subtypes = extText(ext, TCGTRACKING_EXT_KEYS.subtypes);
  const cost = Number(extText(ext, TCGTRACKING_EXT_KEYS.cost));
  const colors = extValues(ext, TCGTRACKING_EXT_KEYS.color);
  const set = fallbackTcgtrackingSet(data);
  return {
    id,
    name: data.product.name,
    image: tcgtrackingCardImage(data.product.id),
    set: fallbackSetCode(set, data.primarySetCode),
    setName: data.primarySetName ?? set.name,
    collectorNumber: printedCollectorNumber(data.product.number),
    rarity: data.product.rarity ?? "",
    typeLine:
      extText(ext, TCGTRACKING_EXT_KEYS.fullType) ??
      [type, subtypes].filter(Boolean).join(TCGTRACKING_TYPE_LINE_SEPARATOR),
    text:
      extText(ext, TCGTRACKING_EXT_KEYS.text)?.replace(/<[^>]+>/g, "") ||
      undefined,
    power: extText(ext, TCGTRACKING_EXT_KEYS.power),
    toughness: extText(ext, TCGTRACKING_EXT_KEYS.toughness),
    colorIdentity: config.colorIdentityOf?.(colors) ?? colors,
    price: null,
    priceFoil: null,
    cmc: Number.isFinite(cost) ? cost : undefined,
    tcgplayerId: String(data.product.id),
    lang: "en",
    isFallbackData: true,
    raw: data,
  };
}

export function withFallbackIdentity(
  primaryCard: PlayingCard,
  fallbackCard: PlayingCard,
): PlayingCard {
  return {
    ...primaryCard,
    id: fallbackCard.id,
    image: fallbackCard.image,
    set: fallbackCard.set,
    tcgplayerId: fallbackCard.tcgplayerId,
    lang: fallbackCard.lang,
    price: null,
    priceFoil: null,
    sourceUrl: undefined,
    isFallbackData: true,
    raw: fallbackCard.raw,
  };
}

export function toTcgtrackingFallbackData(
  entry: TcgtrackingCatalogEntry,
  primarySet: TcgtrackingPrimarySet | undefined,
  config: TcgtrackingGameConfig,
): TcgtrackingFallbackData {
  return {
    ...config.primaryShapedFieldsOf?.({
      name: entry.product.name,
      collectorNumber: printedCollectorNumber(entry.product.number),
      product: entry.product,
      ext: entry.product.ext_data ?? {},
      setCode: fallbackSetCode(entry.set, primarySet?.code),
      tcgtrackingSetName: entry.set.name,
      primarySetName: primarySet?.name,
    }),
    source: TCGTRACKING_FALLBACK_SOURCE,
    product: entry.product,
    tcgtrackingSet: entry.set,
    ...(primarySet ? { primarySetCode: primarySet.code } : {}),
    ...(primarySet?.name ? { primarySetName: primarySet.name } : {}),
  };
}

export function toTcgtrackingFallbackSyncCard(
  entry: TcgtrackingCatalogEntry,
  primarySet: TcgtrackingPrimarySet | undefined,
  config: TcgtrackingGameConfig,
): SyncSourceCard {
  const data = toTcgtrackingFallbackData(entry, primarySet, config);
  return {
    id: tcgtrackingFallbackId(entry.product.id),
    name: entry.product.name,
    setCode: fallbackSetCode(entry.set, primarySet?.code),
    imageUrl: tcgtrackingCardImage(entry.product.id).normal,
    data: JSON.stringify(data),
  };
}
