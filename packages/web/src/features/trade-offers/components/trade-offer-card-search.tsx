import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  publicGamesQueryOptions,
  tradeOfferCardSearchQueryOptions,
} from "@/features/trade-offers/api/public-trade-offers";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { SEARCH_DEBOUNCE_MS } from "@/lib/constants/timing";
import { TRADE_OFFER_SEARCH_MIN_LENGTH } from "@/lib/constants/trade-offers";
import type { TradeOfferCardSearchProps } from "@/lib/interfaces/trade-offers";
import { TRADE_OFFER_SEARCH_QUERY_MAX_LENGTH } from "@magic-vault/shared";
import { IconPlus } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";

export function TradeOfferCardSearch({ link, defaultGameKey, onAdd }: TradeOfferCardSearchProps) {
  const { t } = useTranslation("cards");
  const gameSelectId = useId();
  const searchId = useId();
  const { data: games = [] } = useQuery(publicGamesQueryOptions);
  const [selectedGameKey, setSelectedGameKey] = useState<string | null>(null);
  const gameKey = selectedGameKey ?? defaultGameKey ?? games[0]?.key ?? "";
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query.trim(), SEARCH_DEBOUNCE_MS);
  const { data, isFetching } = useQuery(
    tradeOfferCardSearchQueryOptions(link, gameKey, debouncedQuery),
  );
  const results = debouncedQuery.length >= TRADE_OFFER_SEARCH_MIN_LENGTH ? (data?.cards ?? []) : [];
  const gameName = games.find((game) => game.key === gameKey)?.name ?? gameKey;

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)] gap-1.5 max-sm:grid-cols-1">
        <div className="flex flex-col gap-1">
          <label htmlFor={gameSelectId} className="text-xs text-foreground/70">
            {t("tradeOffers.game")}
          </label>
          <Select value={gameKey} onValueChange={(next) => setSelectedGameKey(next as string)}>
            <SelectTrigger id={gameSelectId} className="w-full">
              <SelectValue>{gameName}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {games.map((game) => (
                <SelectItem key={game.key} value={game.key}>
                  {game.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
      </div>
      <p role="status" className="sr-only">
        {debouncedQuery.length >= TRADE_OFFER_SEARCH_MIN_LENGTH && !isFetching
          ? t("tradeOffers.searchResults", { count: results.length })
          : ""}
      </p>
      {results.length > 0 && (
        <ul className="flex max-h-56 flex-col divide-y overflow-y-auto rounded-lg border">
          {results.map((option) => (
            <li key={`${option.gameKey}-${option.lang}-${option.cardId}`} className="flex items-center gap-2 p-2">
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
                aria-label={t("tradeOffers.addOfferedCard", { name: option.name })}
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
      {debouncedQuery.length >= TRADE_OFFER_SEARCH_MIN_LENGTH && !isFetching && results.length === 0 && (
        <p className="text-xs text-foreground/70">{t("tradeOffers.noSearchResults")}</p>
      )}
    </div>
  );
}
