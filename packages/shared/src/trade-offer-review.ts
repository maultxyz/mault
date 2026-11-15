import type {
  TradeOfferCardGroup,
  TradeOfferCardSort,
  TradeOfferLocationSection,
  TradeOfferPlacementSummary,
  TradeOfferReviewCard,
  TradeOfferSideTotals,
  TradeOfferWantedPlacement,
} from "./interfaces/trade-offers.interface";
import { TRADE_OFFER_LOCATION_SECTION_ORDER } from "./constants/trade-offers.constant";

function roundCents(value: number): number {
  return Math.round(value * 100) / 100;
}

export function compareTradeOfferText(left: string, right: string): number {
  return left.localeCompare(right, undefined, { numeric: true, sensitivity: "base" });
}

function cardQuantity(card: TradeOfferReviewCard): number {
  return "quantity" in card ? card.quantity : 1;
}

export function tradeOfferCardGroupKey(card: TradeOfferReviewCard): string {
  return [
    card.gameKey ?? "",
    "lang" in card ? card.lang : "",
    card.setCode.toLowerCase(),
    card.collectorNumber,
    card.name.toLowerCase(),
    card.condition,
    card.isFoil ? "foil" : "nonfoil",
    "foilType" in card ? (card.foilType ?? "") : "",
  ].join("|");
}

export function groupTradeOfferCards(
  cards: TradeOfferReviewCard[],
  prices: (number | null)[] = [],
  placements: (TradeOfferWantedPlacement | null)[] = [],
): TradeOfferCardGroup[] {
  const groups = new Map<string, TradeOfferCardGroup & { pricedTotal: number; hasPrice: boolean }>();
  cards.forEach((card, index) => {
    const key = tradeOfferCardGroupKey(card);
    const group =
      groups.get(key) ??
      { key, card, quantity: 0, unitPrice: null, totalPrice: null, scanIds: [], placements: [], pricedTotal: 0, hasPrice: false };
    const price = prices[index] ?? null;
    group.quantity += cardQuantity(card);
    if (price != null) {
      group.pricedTotal += price;
      group.hasPrice = true;
    }
    if ("scanId" in card) {
      group.scanIds.push(card.scanId);
      group.placements.push(placements[index] ?? null);
    }
    groups.set(key, group);
  });
  return [...groups.values()].map(({ pricedTotal, hasPrice, ...group }) => ({
    ...group,
    totalPrice: hasPrice ? roundCents(pricedTotal) : null,
    unitPrice: hasPrice && group.quantity > 0 ? roundCents(pricedTotal / group.quantity) : null,
  }));
}

export function sortTradeOfferCardGroups(
  rows: TradeOfferCardGroup[],
  sort: TradeOfferCardSort,
): TradeOfferCardGroup[] {
  const byName = (left: TradeOfferCardGroup, right: TradeOfferCardGroup) =>
    compareTradeOfferText(left.card.name, right.card.name);
  const bySet = (left: TradeOfferCardGroup, right: TradeOfferCardGroup) =>
    compareTradeOfferText(left.card.setName || left.card.setCode, right.card.setName || right.card.setCode) ||
    compareTradeOfferText(left.card.collectorNumber, right.card.collectorNumber);
  return [...rows].sort((left, right) => {
    if (sort === "name") return byName(left, right) || bySet(left, right);
    if (sort === "set") return bySet(left, right) || byName(left, right);
    if (left.totalPrice == null || right.totalPrice == null) {
      if (left.totalPrice != null) return -1;
      if (right.totalPrice != null) return 1;
      return byName(left, right);
    }
    return right.totalPrice - left.totalPrice || byName(left, right);
  });
}

export function filterTradeOfferCardGroups(
  rows: TradeOfferCardGroup[],
  query: string,
): TradeOfferCardGroup[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return rows;
  return rows.filter(({ card }) =>
    [card.name, card.setName, card.setCode, card.collectorNumber].some((value) =>
      value?.toLowerCase().includes(needle),
    ),
  );
}

export function tradeOfferSideTotals(
  cards: TradeOfferReviewCard[],
  prices: (number | null)[] = [],
): TradeOfferSideTotals {
  return {
    totalCards: cards.reduce((sum, card) => sum + cardQuantity(card), 0),
    uniqueCards: new Set(cards.map(tradeOfferCardGroupKey)).size,
    totalValue: roundCents(prices.reduce<number>((sum, price) => sum + (price ?? 0), 0)),
  };
}

export function tradeOfferPlacementSection(
  placement: TradeOfferWantedPlacement | null,
): Omit<TradeOfferLocationSection, "rows"> {
  if (!placement) return { key: "missing", kind: "missing", name: "", binNumber: null };
  if (placement.storageLocationName != null) {
    return {
      key: `storage|${placement.storageLocationGuid ?? placement.storageLocationName}`,
      kind: "storage",
      name: placement.storageLocationName,
      binNumber: null,
    };
  }
  if (placement.binNumber != null) {
    return {
      key: `bin|${placement.collectionName}|${placement.binNumber}`,
      kind: "bin",
      name: placement.collectionName,
      binNumber: placement.binNumber,
    };
  }
  return {
    key: `collection|${placement.collectionName}`,
    kind: "collection",
    name: placement.collectionName,
    binNumber: null,
  };
}

function lowestPosition(row: TradeOfferCardGroup): number {
  const positions = row.placements.flatMap((placement) =>
    placement?.storagePosition != null ? [placement.storagePosition] : [],
  );
  return positions.length > 0 ? Math.min(...positions) : Number.MAX_SAFE_INTEGER;
}

export function groupTradeOfferCardsByLocation(
  cards: TradeOfferReviewCard[],
  prices: (number | null)[],
  placements: (TradeOfferWantedPlacement | null)[],
  sort: TradeOfferCardSort,
): TradeOfferLocationSection[] {
  const partitions = new Map<string, { section: Omit<TradeOfferLocationSection, "rows">; indexes: number[] }>();
  cards.forEach((_, index) => {
    const section = tradeOfferPlacementSection(placements[index] ?? null);
    const partition = partitions.get(section.key) ?? { section, indexes: [] };
    partition.indexes.push(index);
    partitions.set(section.key, partition);
  });
  return [...partitions.values()]
    .map(({ section, indexes }) => {
      const rows = sortTradeOfferCardGroups(
        groupTradeOfferCards(
          indexes.map((index) => cards[index]),
          indexes.map((index) => prices[index] ?? null),
          indexes.map((index) => placements[index] ?? null),
        ),
        sort,
      );
      return {
        ...section,
        rows:
          section.kind === "storage"
            ? [...rows].sort((left, right) => lowestPosition(left) - lowestPosition(right))
            : rows,
      };
    })
    .sort(
      (left, right) =>
        TRADE_OFFER_LOCATION_SECTION_ORDER[left.kind] - TRADE_OFFER_LOCATION_SECTION_ORDER[right.kind] ||
        compareTradeOfferText(left.name, right.name) ||
        (left.binNumber ?? 0) - (right.binNumber ?? 0),
    );
}

export function filterTradeOfferLocationSections(
  sections: TradeOfferLocationSection[],
  query: string,
): TradeOfferLocationSection[] {
  return sections
    .map((section) => ({ ...section, rows: filterTradeOfferCardGroups(section.rows, query) }))
    .filter((section) => section.rows.length > 0);
}

export function limitTradeOfferLocationSections(
  sections: TradeOfferLocationSection[],
  rowLimit: number,
): TradeOfferLocationSection[] {
  let remaining = rowLimit;
  const limited: TradeOfferLocationSection[] = [];
  for (const section of sections) {
    if (remaining <= 0) break;
    const rows = section.rows.slice(0, remaining);
    remaining -= rows.length;
    limited.push({ ...section, rows });
  }
  return limited;
}

export function summarizeTradeOfferPlacements(
  placements: (TradeOfferWantedPlacement | null)[],
): TradeOfferPlacementSummary[] {
  const storage = new Map<string, { locationName: string; positions: number[] }>();
  const bins = new Map<string, number[]>();
  const collections = new Set<string>();
  let missing = 0;
  for (const placement of placements) {
    if (!placement) {
      missing += 1;
    } else if (placement.storageLocationName != null) {
      const key = placement.storageLocationGuid ?? placement.storageLocationName;
      const entry = storage.get(key) ?? { locationName: placement.storageLocationName, positions: [] };
      if (placement.storagePosition != null) entry.positions.push(placement.storagePosition);
      storage.set(key, entry);
    } else if (placement.binNumber != null) {
      bins.set(placement.collectionName, [...(bins.get(placement.collectionName) ?? []), placement.binNumber]);
    } else {
      collections.add(placement.collectionName);
    }
  }
  const unique = (values: number[]) => [...new Set(values)].sort((left, right) => left - right);
  return [
    ...[...storage.values()].map((entry) => ({
      kind: "storage" as const,
      locationName: entry.locationName,
      positions: unique(entry.positions),
    })),
    ...[...bins.entries()].map(([collectionName, binNumbers]) => ({
      kind: "bin" as const,
      collectionName,
      binNumbers: unique(binNumbers),
    })),
    ...[...collections].map((collectionName) => ({ kind: "collection" as const, collectionName })),
    ...(missing > 0 ? [{ kind: "missing" as const, count: missing }] : []),
  ];
}
