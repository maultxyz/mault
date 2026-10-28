import type { PlayingCard } from "@magic-vault/shared";
import {
  TCGTRACKING_EXT_KEYS,
  TCGTRACKING_FALLBACK_SOURCE,
  TCGTRACKING_TYPE_LINE_SEPARATOR,
} from "../constants/tcgtracking";
import type { SyncSourceCard } from "../interfaces/card-search";
import type {
  TcgtrackingCatalogEntry,
  TcgtrackingFallbackData,
  TcgtrackingGameConfig,
} from "../interfaces/tcgtracking";
import { tcgtrackingCardImage, tcgtrackingFallbackId } from "./catalog";

export function isTcgtrackingFallbackData(
  data: unknown,
): data is TcgtrackingFallbackData {
  return (
    typeof data === "object" &&
    data !== null &&
    (data as { source?: unknown }).source === TCGTRACKING_FALLBACK_SOURCE
  );
}

function extValues(
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

function extText(
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

function fallbackSetCode(data: Pick<TcgtrackingFallbackData, "set" | "primarySetCode">): string {
  return data.primarySetCode ?? data.set.abbreviation ?? String(data.set.id);
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
  return {
    id,
    name: data.product.name,
    image: tcgtrackingCardImage(data.product.id),
    set: fallbackSetCode(data),
    setName: data.set.name,
    collectorNumber: data.product.number ?? "",
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
    raw: data,
  };
}

export function toTcgtrackingFallbackSyncCard(
  entry: TcgtrackingCatalogEntry,
  primarySetCode: string | undefined,
): SyncSourceCard {
  const data: TcgtrackingFallbackData = {
    source: TCGTRACKING_FALLBACK_SOURCE,
    product: entry.product,
    set: entry.set,
    ...(primarySetCode ? { primarySetCode } : {}),
  };
  return {
    id: tcgtrackingFallbackId(entry.product.id),
    name: entry.product.name,
    setCode: fallbackSetCode(data),
    imageUrl: tcgtrackingCardImage(entry.product.id).normal,
    data: JSON.stringify(data),
  };
}
