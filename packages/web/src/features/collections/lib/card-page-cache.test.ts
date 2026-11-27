import { collectionCardsKeys } from "@/features/collections/api/collection-cards";
import { addScannedCardToCollectionCardCaches } from "@/features/collections/lib/card-page-cache";
import { ALL_CARDS_QUERY } from "@/lib/constants/card-filters";
import {
  EMPTY_CARD_FILTERS,
  type CollectionCardsPage,
  type CollectionCardsQuery,
  type CollectionCardsSummary,
  type GroupedScannedCard,
  type ScannedCard,
} from "@magic-vault/shared";
import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

const GUID = "collection";
const PAGE_SIZE = 2;

function scannedCard(scanId: string): ScannedCard {
  return { scanId, scannedAt: 1 } as ScannedCard;
}

function pageOf(scanIds: string[]): CollectionCardsPage {
  return {
    items: scanIds.map(
      (scanId) =>
        ({ ...scannedCard(scanId), scanIds: [scanId], quantity: 1 }) as GroupedScannedCard,
    ),
    page: 0,
    pageSize: PAGE_SIZE,
    totalEntries: 10,
    totalCards: 10,
  };
}

function pageKey(query: CollectionCardsQuery, page = 0) {
  return [...collectionCardsKeys.page(GUID, query, page), PAGE_SIZE];
}

function summaryOf(totalCount: number): CollectionCardsSummary {
  return {
    all: { totalCount },
    filtered: { totalCount },
  } as CollectionCardsSummary;
}

describe("addScannedCardToCollectionCardCaches", () => {
  it("puts the card first on the newest-first first page and counts it", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(pageKey(ALL_CARDS_QUERY), pageOf(["b", "a"]));
    queryClient.setQueryData(
      collectionCardsKeys.summary(GUID, ALL_CARDS_QUERY),
      summaryOf(10),
    );

    addScannedCardToCollectionCardCaches(queryClient, GUID, scannedCard("c"));

    const page = queryClient.getQueryData<CollectionCardsPage>(pageKey(ALL_CARDS_QUERY));
    expect(page?.items.map((item) => item.scanId)).toEqual(["c", "b"]);
    expect(page?.totalEntries).toBe(11);
    expect(page?.totalCards).toBe(11);
    expect(
      queryClient.getQueryData<CollectionCardsSummary>(
        collectionCardsKeys.summary(GUID, ALL_CARDS_QUERY),
      )?.all.totalCount,
    ).toBe(11);
  });

  it("adds a card only once", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(pageKey(ALL_CARDS_QUERY), pageOf(["b", "a"]));

    addScannedCardToCollectionCardCaches(queryClient, GUID, scannedCard("b"));

    expect(
      queryClient.getQueryData<CollectionCardsPage>(pageKey(ALL_CARDS_QUERY)),
    ).toEqual(pageOf(["b", "a"]));
  });

  it("leaves filtered, sorted, grouped and later pages for the server refresh", () => {
    const queryClient = new QueryClient();
    const untouchedKeys = [
      pageKey({ ...ALL_CARDS_QUERY, search: "bolt" }),
      pageKey({ ...ALL_CARDS_QUERY, sort: "name-asc" }),
      pageKey({ ...ALL_CARDS_QUERY, grouped: true }),
      pageKey({
        ...ALL_CARDS_QUERY,
        filters: { ...EMPTY_CARD_FILTERS, needsAttention: true },
      }),
      pageKey(ALL_CARDS_QUERY, 1),
    ];
    for (const key of untouchedKeys) queryClient.setQueryData(key, pageOf(["b", "a"]));

    addScannedCardToCollectionCardCaches(queryClient, GUID, scannedCard("c"));

    for (const key of untouchedKeys) {
      expect(queryClient.getQueryData<CollectionCardsPage>(key)).toEqual(
        pageOf(["b", "a"]),
      );
    }
  });
});
