import type {
  TradeOffer,
  TradeOfferPickListItem,
  TradeOfferPickListSection,
  TradeOfferPickProgress,
  TradeOfferPickSplit,
  TradeOfferWantedCard,
  TradeOfferWantedPlacement,
} from "./interfaces/trade-offers.interface";
import { TRADE_OFFER_LOCATION_SECTION_ORDER } from "./constants/trade-offers.constant";
import { compareTradeOfferText, tradeOfferPlacementSection } from "./trade-offer-review";

export function splitTradeOfferPickScanIds(
  remainingScanIds: string[],
  pickedScanIds: string[] | "all",
): TradeOfferPickSplit {
  if (pickedScanIds === "all") return { pickedScanIds: [...new Set(remainingScanIds)], remainingScanIds: [] };
  const requested = new Set(pickedScanIds);
  const picked = new Set<string>();
  const remaining: string[] = [];
  for (const scanId of remainingScanIds) {
    if (requested.has(scanId)) picked.add(scanId);
    else if (!remaining.includes(scanId)) remaining.push(scanId);
  }
  return { pickedScanIds: [...picked], remainingScanIds: remaining };
}

export function initialTradeOfferPickScanIds(wanted: Pick<TradeOfferWantedCard, "scanId">[]): string[] | null {
  const scanIds = [...new Set(wanted.map((card) => card.scanId))];
  return scanIds.length > 0 ? scanIds : null;
}

export function isTradeOfferBeingPicked(
  offer: Pick<TradeOffer, "status" | "remainingPickScanIds">,
): boolean {
  return offer.status === "accepted" && (offer.remainingPickScanIds?.length ?? 0) > 0;
}

export function tradeOfferPickProgress(
  wanted: Pick<TradeOfferWantedCard, "scanId">[],
  remainingScanIds: string[],
): TradeOfferPickProgress {
  const allScanIds = new Set(wanted.map((card) => card.scanId));
  const remaining = new Set(remainingScanIds.filter((scanId) => allScanIds.has(scanId)));
  return { pickedCount: allScanIds.size - remaining.size, totalCount: allScanIds.size };
}

function comparePickListItems(left: TradeOfferPickListItem, right: TradeOfferPickListItem): number {
  const leftPosition = left.placement?.storagePosition ?? Number.MAX_SAFE_INTEGER;
  const rightPosition = right.placement?.storagePosition ?? Number.MAX_SAFE_INTEGER;
  return (
    leftPosition - rightPosition ||
    compareTradeOfferText(left.card.name, right.card.name) ||
    compareTradeOfferText(left.card.setName || left.card.setCode, right.card.setName || right.card.setCode) ||
    compareTradeOfferText(left.card.collectorNumber, right.card.collectorNumber)
  );
}

export function tradeOfferPickListSections(
  wanted: TradeOfferWantedCard[],
  prices: (number | null)[],
  placements: (TradeOfferWantedPlacement | null)[],
  remainingScanIds: string[],
): TradeOfferPickListSection[] {
  const remaining = new Set(remainingScanIds);
  const sections = new Map<string, { location: ReturnType<typeof tradeOfferPlacementSection>; items: TradeOfferPickListItem[] }>();
  const pickedSection: TradeOfferPickListSection = { key: "picked", kind: "picked", name: "", binNumber: null, items: [] };
  const seenScanIds = new Set<string>();
  wanted.forEach((card, index) => {
    if (seenScanIds.has(card.scanId)) return;
    seenScanIds.add(card.scanId);
    const placement = placements[index] ?? null;
    const item: TradeOfferPickListItem = {
      scanId: card.scanId,
      card,
      price: prices[index] ?? null,
      placement,
      isPicked: !remaining.has(card.scanId),
    };
    if (item.isPicked && !placement) {
      pickedSection.items.push(item);
      return;
    }
    const location = tradeOfferPlacementSection(placement);
    const section = sections.get(location.key) ?? { location, items: [] };
    section.items.push(item);
    sections.set(location.key, section);
  });
  const ordered: TradeOfferPickListSection[] = [...sections.values()]
    .sort(
      ({ location: left }, { location: right }) =>
        TRADE_OFFER_LOCATION_SECTION_ORDER[left.kind] - TRADE_OFFER_LOCATION_SECTION_ORDER[right.kind] ||
        compareTradeOfferText(left.name, right.name) ||
        (left.binNumber ?? 0) - (right.binNumber ?? 0),
    )
    .map(({ location, items }) => ({ ...location, items: [...items].sort(comparePickListItems) }));
  return pickedSection.items.length > 0
    ? [...ordered, { ...pickedSection, items: [...pickedSection.items].sort(comparePickListItems) }]
    : ordered;
}

export function rememberTradeOfferPlacements(
  knownPlacements: ReadonlyMap<string, TradeOfferWantedPlacement>,
  offer: Pick<TradeOffer, "wanted" | "wantedPlacements">,
): Map<string, TradeOfferWantedPlacement> {
  const remembered = new Map(knownPlacements);
  offer.wantedPlacements?.forEach((placement, index) => {
    const scanId = offer.wanted[index]?.scanId;
    if (scanId && placement) remembered.set(scanId, placement);
  });
  return remembered;
}
