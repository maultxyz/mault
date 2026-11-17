import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { inPersonCatalogSearchQueryOptions } from "@/features/trade-offers/api/in-person-trades";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { SEARCH_DEBOUNCE_MS } from "@/lib/constants/timing";
import { TRADE_OFFER_SEARCH_MIN_LENGTH } from "@/lib/constants/trade-offers";
import type { InPersonReceivedCardSearchProps } from "@/lib/interfaces/trade-offers";
import { TRADE_OFFER_SEARCH_QUERY_MAX_LENGTH, toTradeOfferCardOption } from "@magic-vault/shared";
import { IconPlus } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";

export function InPersonReceivedCardSearch({ collectionGuid, gameKey, onAdd }: InPersonReceivedCardSearchProps) {
  const { t } = useTranslation("cards");
  const { t: tCommon } = useTranslation("common");
  const searchId = useId();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query.trim(), SEARCH_DEBOUNCE_MS);
  const isSearching = debouncedQuery.length >= TRADE_OFFER_SEARCH_MIN_LENGTH;
  const { data, isFetching } = useQuery(inPersonCatalogSearchQueryOptions(collectionGuid, debouncedQuery));
  const results = isSearching ? (data?.cards ?? []).map((card) => toTradeOfferCardOption(card, gameKey)) : [];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-1">
        <label htmlFor={searchId} className="text-xs text-foreground/70">
          {t("tradeOffers.searchLabel")}
        </label>
        <Input
          id={searchId}
          type="search"
          value={query}
          maxLength={TRADE_OFFER_SEARCH_QUERY_MAX_LENGTH}
          placeholder={t("tradeOffers.searchPlaceholder")}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      <p role="status" className="sr-only">
        {isSearching && !isFetching ? t("tradeOffers.searchResults", { count: results.length }) : ""}
      </p>
      {results.length > 0 && (
        <ul className="flex max-h-56 flex-col divide-y divide-border overflow-y-auto">
          {results.map((option) => (
            <li key={option.cardId} className="flex items-center gap-2 p-2">
              <img
                src={option.imageUrl ?? ""}
                alt=""
                className="aspect-[2.5/3.5] w-8 shrink-0 rounded-sm bg-muted object-cover"
              />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-control font-medium">{option.name}</span>
                <span className="truncate text-xs text-foreground/70">
                  {[option.setName || option.setCode.toUpperCase(), option.collectorNumber ? `#${option.collectorNumber}` : null]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </div>
              <Button
                variant="outline"
                aria-label={tCommon("tradeOffers.inPerson.addReceivedCard", { name: option.name })}
                onClick={() => {
                  onAdd(option);
                  setQuery("");
                }}
              >
                <IconPlus />
                {t("tradeOffers.add")}
              </Button>
            </li>
          ))}
        </ul>
      )}
      {isSearching && !isFetching && results.length === 0 && (
        <p className="text-xs text-foreground/70">{t("tradeOffers.noSearchResults")}</p>
      )}
    </div>
  );
}
