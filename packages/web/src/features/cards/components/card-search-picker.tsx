import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCardSearch } from "@/features/cards/api/use-card-search";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { SEARCH_DEBOUNCE_MS } from "@/lib/constants/timing";
import type { CardSearchPickerProps } from "@/lib/interfaces/cards";
import { IconLoader2, IconSearch } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function CardSearchPicker({
  collectionGuid,
  initialQuery = "",
  disabled = false,
  onSelect,
}: CardSearchPickerProps) {
  const { t } = useTranslation("cards");
  const [query, setQuery] = useState(initialQuery);
  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);
  const { results, loading, hasMore, isLoadingMore, loadMore } = useCardSearch(
    debouncedQuery,
    collectionGuid,
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="relative">
        <IconSearch className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-foreground/70" />
        <Input
          type="search"
          placeholder={t("cardPicker.searchPlaceholder")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-8"
        />
      </div>
      <div
        data-vaul-no-drag
        className="max-h-[50dvh] min-h-48 flex-1 overflow-y-auto rounded-lg border bg-muted/40 p-2"
      >
        {loading && (
          <div className="flex items-center justify-center py-8">
            <IconLoader2 className="size-5 animate-spin text-foreground/70" />
          </div>
        )}
        {!loading && results.length === 0 && (
          <p className="py-8 text-center text-sm text-foreground/70">
            {query.trim().length === 0
              ? t("cardPicker.startTyping")
              : t("cardPicker.noCardsFound")}
          </p>
        )}
        {!loading && results.length > 0 && (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {results.map((result) => (
              <button
                key={result.id}
                type="button"
                disabled={disabled}
                onClick={() => onSelect(result)}
                className="relative aspect-[2.5/3.5] overflow-hidden rounded-md border transition-transform active:scale-[0.97] disabled:opacity-50"
              >
                {result.image?.small ? (
                  <img
                    src={result.image.small}
                    alt={result.name}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full bg-muted" />
                )}
                <span className="absolute inset-x-0 bottom-0 truncate bg-black/70 px-1 py-0.5 text-center text-[10px] leading-tight text-white">
                  {result.set.toUpperCase()} #{result.collectorNumber}
                </span>
              </button>
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
              {t("cardPicker.loadMore")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
