import type { SetStats } from "@/features/scanner/types";
import { CARD_COLOR_SWATCHES } from "@/lib/constants/colors";
import { RARITY_LABELS, RARITY_ORDER } from "@/lib/constants/rarity";
import type { ScannedCard } from "@magic-vault/shared";

function capitalize(value: string): string {
  return value.length > 0
    ? value.charAt(0).toUpperCase() + value.slice(1)
    : value;
}

function sortRarities<T extends { key: string; count: number }>(
  entries: T[],
): T[] {
  return [...entries].sort((a, b) => {
    const orderA = RARITY_ORDER.indexOf(a.key);
    const orderB = RARITY_ORDER.indexOf(b.key);
    if (orderA !== -1 && orderB !== -1) return orderA - orderB;
    if (orderA !== -1) return -1;
    if (orderB !== -1) return 1;
    return b.count - a.count;
  });
}

export interface ScanStats {
  totalCount: number;
  uniqueCount: number;
  totalValue: number;
  avgValue: number;
  hasPricing: boolean;
  mostValuable: { name: string; price: number } | null;
  sets: SetStats[];
  rarities: { key: string; label: string; count: number }[];
  colors: { key: string; label: string; bg: string; count: number }[];
}

export function computeStats(cards: ScannedCard[]): ScanStats | null {
  if (cards.length === 0) return null;

  let totalValue = 0;
  let priceableCount = 0;
  const setMap = new Map<string, SetStats>();
  const rarityMap = new Map<string, number>();
  const colorMap = new Map<string, number>();
  let mostValuable: { name: string; price: number } | null = null;
  const uniqueCards = new Set<string>();

  for (const entry of cards) {
    const c = entry.card;
    const price = (entry.isFoil ? c.priceFoil : c.price) ?? c.price ?? 0;

    uniqueCards.add(c.id);

    if (price > 0) {
      totalValue += price;
      priceableCount++;
    }

    if (price > 0 && (!mostValuable || price > mostValuable.price)) {
      mostValuable = { name: c.name, price };
    }

    const existing = setMap.get(c.set);
    if (existing) {
      existing.count++;
      existing.value += price;
    } else {
      setMap.set(c.set, {
        code: c.set,
        name: c.setName,
        count: 1,
        value: price,
      });
    }

    if (c.rarity) {
      rarityMap.set(c.rarity, (rarityMap.get(c.rarity) ?? 0) + 1);
    }

    for (const color of c.colorIdentity) {
      colorMap.set(color, (colorMap.get(color) ?? 0) + 1);
    }
  }

  return {
    totalCount: cards.length,
    uniqueCount: uniqueCards.size,
    totalValue,
    avgValue: priceableCount > 0 ? totalValue / priceableCount : 0,
    hasPricing: priceableCount > 0,
    mostValuable,
    sets: Array.from(setMap.values()).sort(
      (a, b) => b.value - a.value || b.count - a.count,
    ),
    rarities: sortRarities(
      Array.from(rarityMap.entries()).map(([key, count]) => ({
        key,
        label: RARITY_LABELS[key] ?? capitalize(key),
        count,
      })),
    ),
    colors: Array.from(colorMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([key, count]) => ({
        key,
        label: CARD_COLOR_SWATCHES[key]?.label ?? key,
        bg: CARD_COLOR_SWATCHES[key]?.bg ?? key.toLowerCase(),
        count,
      })),
  };
}

export function computeDisplayStats(
  allCards: ScannedCard[],
  visibleCards: ScannedCard[],
): ScanStats | null {
  const all = computeStats(allCards);
  if (!all) return null;

  const visible = computeStats(visibleCards);

  return {
    totalCount: visible?.totalCount ?? 0,
    uniqueCount: visible?.uniqueCount ?? 0,
    totalValue: visible?.totalValue ?? 0,
    avgValue: visible?.avgValue ?? 0,
    hasPricing: visible?.hasPricing ?? false,
    mostValuable: visible?.mostValuable ?? null,
    sets: all.sets,
    rarities: all.rarities,
    colors: all.colors,
  };
}
