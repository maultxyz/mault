import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useOrg } from "@/features/companies/api/use-organization";
import { inPersonOwnedCardSearchQueryOptions } from "@/features/trade-offers/api/in-person-trades";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { SEARCH_DEBOUNCE_MS } from "@/lib/constants/timing";
import { TRADE_OFFER_SEARCH_MIN_LENGTH } from "@/lib/constants/trade-offers";
import type { InPersonGivenCardSearchProps } from "@/lib/interfaces/trade-offers";
import { TRADE_OFFER_SEARCH_QUERY_MAX_LENGTH, ownedCardSearchSubtitle } from "@magic-vault/shared";
import { IconPlus } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";

export function InPersonGivenCardSearch({ selectedScanIds, onAdd }: InPersonGivenCardSearchProps) {
  const { t } = useTranslation("common");
  const { t: tCards } = useTranslation("cards");
  const searchId = useId();
  const { activeOrg } = useOrg();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query.trim(), SEARCH_DEBOUNCE_MS);
  const isSearching = debouncedQuery.length >= TRADE_OFFER_SEARCH_MIN_LENGTH;
  const { data, isFetching } = useQuery(inPersonOwnedCardSearchQueryOptions(activeOrg?.id, debouncedQuery));
  const selected = new Set(selectedScanIds);
  const results = isSearching ? (data ?? []).filter((result) => !selected.has(result.scanId)) : [];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-1">
        <label htmlFor={searchId} className="text-xs text-foreground/70">
          {t("tradeOffers.inPerson.searchOwnedLabel")}
        </label>
        <Input
          id={searchId}
          type="search"
          value={query}
          maxLength={TRADE_OFFER_SEARCH_QUERY_MAX_LENGTH}
          placeholder={tCards("tradeOffers.searchPlaceholder")}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      <p role="status" className="sr-only">
        {isSearching && !isFetching ? tCards("tradeOffers.searchResults", { count: results.length }) : ""}
      </p>
      {results.length > 0 && (
        <ul className="flex max-h-56 flex-col divide-y divide-border overflow-y-auto">
          {results.map((result) => {
            const subtitle = ownedCardSearchSubtitle(result, tCards("foil"));
            return (
              <li key={result.scanId} className="flex items-center gap-2 p-2">
                <img
                  src={result.imageUrl ?? ""}
                  alt=""
                  className="aspect-[2.5/3.5] w-8 shrink-0 rounded-sm bg-muted object-cover"
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
        </ul>
      )}
      {isSearching && !isFetching && results.length === 0 && (
        <p className="text-xs text-foreground/70">{tCards("tradeOffers.noSearchResults")}</p>
      )}
    </div>
  );
}
