import { CardTileSkeletonGrid } from "@/components/card-tile-skeleton-grid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGameCardSearch } from "@/features/cards/api/use-game-card-search";
import { gameCoverageQueryOptions } from "@/features/games/api/games";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { LANGUAGE_LABELS } from "@/lib/constants/languages";
import { SEARCH_DEBOUNCE_MS } from "@/lib/constants/timing";
import { QUERY_MIN_LENGTH } from "@magic-vault/shared";
import { IconLoader2, IconSearch } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function CardLookup() {
  const { t } = useTranslation("health");
  const { data: coverage = [] } = useQuery(gameCoverageQueryOptions);
  const games = coverage.filter((game) => game.cardCount > 0);
  const [gameKey, setGameKey] = useState<string | null>(null);
  const [lang, setLang] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);

  const game = games.find((g) => g.key === gameKey) ?? games[0];
  const languages = game?.languages.length ? game.languages : ["en"];
  const activeLang = lang && languages.includes(lang) ? lang : languages[0];
  const { results, loading, hasMore, isLoadingMore, loadMore } =
    useGameCardSearch(debouncedQuery, game?.key ?? null, activeLang);
  const isQueryReady = debouncedQuery.trim().length >= QUERY_MIN_LENGTH;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <Select
          value={game?.key ?? null}
          onValueChange={(value) => setGameKey(value)}
        >
          <SelectTrigger className="w-44" aria-label={t("cardLookup.game")}>
            <SelectValue>{game?.name ?? t("cardLookup.noGames")}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {games.map((g) => (
              <SelectItem key={g.key} value={g.key}>
                {g.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {languages.length > 1 && (
          <Select value={activeLang} onValueChange={(value) => setLang(value)}>
            <SelectTrigger
              className="w-36"
              aria-label={t("cardLookup.language")}
            >
              <SelectValue>
                {LANGUAGE_LABELS[activeLang] ?? activeLang}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {languages.map((l) => (
                <SelectItem key={l} value={l}>
                  {LANGUAGE_LABELS[l] ?? l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <div className="relative min-w-48 flex-1">
          <IconSearch className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-foreground/70" />
          <Input
            type="search"
            placeholder={t("cardLookup.searchPlaceholder")}
            value={query}
            disabled={!game}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {isQueryReady && (
        <div className="rounded-lg border bg-muted/40 p-2">
          {loading && <CardTileSkeletonGrid />}
          {!loading && results.length === 0 && (
            <p className="py-8 text-center text-sm text-foreground/70">
              {t("cardLookup.noResults")}
            </p>
          )}
          {!loading && results.length > 0 && (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {results.map((card) => (
                <div key={card.id} className="flex min-w-0 flex-col gap-1">
                  <div className="aspect-[2.5/3.5] overflow-hidden rounded-md border">
                    {card.image?.small ? (
                      <img
                        src={card.image.small}
                        alt={card.name}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full bg-muted" />
                    )}
                  </div>
                  <p className="truncate text-xs font-medium">{card.name}</p>
                  <p className="truncate text-2xs text-foreground/70">
                    {card.set.toUpperCase()} #{card.collectorNumber}
                  </p>
                </div>
              ))}
            </div>
          )}
          {!loading && hasMore && (
            <div className="flex justify-center pt-3">
              <Button
                variant="outline"
                onClick={loadMore}
                disabled={isLoadingMore}
              >
                {isLoadingMore && <IconLoader2 className="animate-spin" />}
                {t("cardLookup.loadMore")}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
