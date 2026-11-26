import type { OrgProfileShowcaseCardsById } from "@/lib/interfaces/org-profile";
import {
  DEFAULT_ORG_PROFILE_SHOWS_PRICES,
  suggestOrgProfileHandle,
  type OrgProfile,
  type OrgProfileFormValues,
  type OrgProfileShowcaseCard,
  type ScannedCard,
} from "@magic-vault/shared";

export function orgProfileFormValues(
  profile: OrgProfile | null,
  orgName: string,
): OrgProfileFormValues {
  if (!profile) {
    return {
      handle: suggestOrgProfileHandle(orgName),
      displayName: orgName,
      bio: "",
      links: [],
      showcaseScanIds: [],
      shopCatalogGuids: [],
      showsPrices: DEFAULT_ORG_PROFILE_SHOWS_PRICES,
      isPublished: false,
    };
  }
  return {
    handle: profile.handle,
    displayName: profile.displayName,
    bio: profile.bio,
    links: profile.links.map((link) => ({ ...link })),
    showcaseScanIds: profile.showcaseCards.map((card) => card.scanId),
    shopCatalogGuids: [...profile.shopCatalogGuids],
    showsPrices: profile.showsPrices,
    isPublished: profile.isPublished,
  };
}

export function moveListItem<T>(items: readonly T[], fromIndex: number, toIndex: number): T[] {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= items.length ||
    toIndex >= items.length
  ) {
    return [...items];
  }
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

export function toggleShowcaseScanId(
  scanIds: readonly string[],
  scanId: string,
  maxCount: number,
): string[] {
  if (scanIds.includes(scanId)) return scanIds.filter((selected) => selected !== scanId);
  if (scanIds.length >= maxCount) return [...scanIds];
  return [...scanIds, scanId];
}

export function showcaseCardFromScannedCard(entry: ScannedCard): OrgProfileShowcaseCard {
  return {
    scanId: entry.scanId,
    name: entry.card.name,
    setCode: entry.card.set || null,
    imageUrl: entry.card.image?.normal ?? entry.card.image?.small ?? null,
  };
}

export function showcaseCardsById(
  cards: readonly OrgProfileShowcaseCard[],
): OrgProfileShowcaseCardsById {
  return Object.fromEntries(cards.map((card) => [card.scanId, card]));
}
