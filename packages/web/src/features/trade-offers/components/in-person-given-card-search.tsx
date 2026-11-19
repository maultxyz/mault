import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCollections } from "@/features/collections/api/use-collections";
import { useOrg } from "@/features/companies/api/use-organization";
import {
  inPersonCollectionCardsQueryOptions,
  inPersonOwnedCardSearchQueryOptions,
} from "@/features/trade-offers/api/in-person-trades";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { SEARCH_DEBOUNCE_MS } from "@/lib/constants/timing";
import {
  IN_PERSON_GIVEN_ALL_COLLECTIONS,
  TRADE_OFFER_SEARCH_MIN_LENGTH,
} from "@/lib/constants/trade-offers";
import type { InPersonGivenCardSearchProps } from "@/lib/interfaces/trade-offers";
import { TRADE_OFFER_SEARCH_QUERY_MAX_LENGTH, ownedCardSearchSubtitle } from "@magic-vault/shared";
import { IconPlus } from "@tabler/icons-react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";

export function InPersonGivenCardSearch({ selectedScanIds, onAdd }: InPersonGivenCardSearchProps) {
  const { t } = useTranslation("common");
  const { t: tCards } = useTranslation("cards");
  const searchId = useId();
  const sourceId = useId();
  const { activeOrg } = useOrg();
  const { collections } = useCollections();
  const [sourceCollectionGuid, setSourceCollectionGuid] = useState(IN_PERSON_GIVEN_ALL_COLLECTIONS);
  const sourceCollection = collections.find((collection) => collection.guid === sourceCollectionGuid) ?? null;
  const isBrowsingCollection = !!sourceCollection;
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query.trim(), SEARCH_DEBOUNCE_MS);
  const isSearchingAll = !isBrowsingCollection && debouncedQuery.length >= TRADE_OFFER_SEARCH_MIN_LENGTH;
  const ownedSearch = useQuery({
    ...inPersonOwnedCardSearchQueryOptions(activeOrg?.id, debouncedQuery),
    enabled: !!activeOrg?.id && isSearchingAll,
  });
  const collectionCards = useInfiniteQuery({
    ...inPersonCollectionCardsQueryOptions(activeOrg?.id, sourceCollection?.guid ?? "", debouncedQuery),
    enabled: !!activeOrg?.id && isBrowsingCollection,
  });
  const selected = new Set(selectedScanIds);
  const candidates = isBrowsingCollection
    ? (collectionCards.data?.pages.flat() ?? [])
    : isSearchingAll
      ? (ownedSearch.data ?? [])
      : [];
  const results = candidates.filter((result) => !selected.has(result.scanId));
  const isFetching = isBrowsingCollection ? collectionCards.isFetching : ownedSearch.isFetching;
  const hasAnswer = isBrowsingCollection ? collectionCards.isSuccess : isSearchingAll;

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-[minmax(0,12rem)_minmax(0,1fr)] gap-1.5 max-sm:grid-cols-1">
        <div className="flex flex-col gap-1">
          <label htmlFor={sourceId} className="text-xs text-foreground/70">
            {t("tradeOffers.inPerson.giveSource")}
          </label>
          <Select
            value={sourceCollectionGuid}
            onValueChange={(next) => {
              setSourceCollectionGuid(String(next ?? IN_PERSON_GIVEN_ALL_COLLECTIONS));
              setQuery("");
            }}
          >
            <SelectTrigger id={sourceId} className="w-full">
              <SelectValue>
                {sourceCollection?.name ?? t("tradeOffers.inPerson.allCollections")}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={IN_PERSON_GIVEN_ALL_COLLECTIONS}>
                {t("tradeOffers.inPerson.allCollections")}
              </SelectItem>
              {collections.map((collection) => (
                <SelectItem key={collection.guid} value={collection.guid}>
                  {collection.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={searchId} className="text-xs text-foreground/70">
            {isBrowsingCollection
              ? t("tradeOffers.inPerson.filterCollectionLabel")
              : t("tradeOffers.inPerson.searchOwnedLabel")}
          </label>
          <Input
            id={searchId}
            type="search"
            enterKeyHint="search"
            value={query}
            maxLength={TRADE_OFFER_SEARCH_QUERY_MAX_LENGTH}
            placeholder={tCards("tradeOffers.searchPlaceholder")}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </div>
      <p role="status" className="sr-only">
        {hasAnswer && !isFetching ? tCards("tradeOffers.searchResults", { count: results.length }) : ""}
      </p>
      {results.length > 0 && (
        <ul className="flex max-h-56 flex-col divide-y divide-border overflow-y-auto max-md:max-h-72">
          {results.map((result) => {
            const subtitle = ownedCardSearchSubtitle(result, tCards("foil"));
            return (
              <li key={result.scanId} className="flex items-center gap-2 p-2">
                <img
                  src={result.imageUrl ?? ""}
                  alt=""
                  className="aspect-[2.5/3.5] w-8 shrink-0 rounded-sm bg-muted object-cover max-md:w-10"
                />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-control font-medium">{result.cardName}</span>
                  <span className="truncate text-xs text-foreground/70">{subtitle}</span>
                </div>
                <Button
                  variant="outline"
                  aria-label={t("tradeOffers.inPerson.addGivenCard", { name: result.cardName })}
                  onClick={() =>
                    onAdd({ scanId: result.scanId, name: result.cardName, subtitle, imageUrl: result.imageUrl })
                  }
                >
                  <IconPlus />
                  {tCards("tradeOffers.add")}
                </Button>
              </li>
            );
          })}
          {isBrowsingCollection && collectionCards.hasNextPage && (
            <li className="p-2">
              <Button
                variant="ghost"
                className="w-full"
                disabled={collectionCards.isFetchingNextPage}
                onClick={() => void collectionCards.fetchNextPage()}
              >
                {t("tradeOffers.inPerson.loadMoreCards")}
              </Button>
            </li>
          )}
        </ul>
      )}
      {hasAnswer && !isFetching && results.length === 0 && (
        <p className="text-xs text-foreground/70">
          {isBrowsingCollection && !debouncedQuery
            ? t("tradeOffers.inPerson.noCollectionCards")
            : tCards("tradeOffers.noSearchResults")}
        </p>
      )}
    </div>
  );
}
