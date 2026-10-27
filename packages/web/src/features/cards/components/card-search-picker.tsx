import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCardSearch } from "@/features/cards/api/use-card-search";
import { CardSearchLanguageSelect } from "@/features/cards/components/card-search-language-select";
import { CardSearchResultSkeletonGrid } from "@/features/cards/components/card-search-result-skeleton-grid";
import { CardSearchResultTile } from "@/features/cards/components/card-search-result-tile";
import { CardSearchSetSelect } from "@/features/cards/components/card-search-set-select";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { CARD_SEARCH_ALL_SETS } from "@/lib/constants/cards";
import { SEARCH_DEBOUNCE_MS } from "@/lib/constants/timing";
import type { CardSearchPickerProps } from "@/lib/interfaces/cards";
import { IconLoader2, IconSearch } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CARD_SEARCH_ALL_LANGUAGES,
  cardSearchResultKey,
} from "@magic-vault/shared";

export function CardSearchPicker({
  collectionGuid,
  initialQuery = "",
  disabled = false,
  onSelect,
}: CardSearchPickerProps) {
  const { t } = useTranslation("cards");
  const [query, setQuery] = useState(initialQuery);
  const [selectedSet, setSelectedSet] = useState<string>(CARD_SEARCH_ALL_SETS);
  const [selectedLanguage, setSelectedLanguage] = useState<string>(
    CARD_SEARCH_ALL_LANGUAGES,
  );
  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);
  const {
    results,
    sets,
    totalCount,
    loading,
    hasMore,
    isLoadingMore,
    loadMore,
  } = useCardSearch(
    debouncedQuery,
    collectionGuid,
    selectedSet !== CARD_SEARCH_ALL_SETS ? selectedSet : undefined,
    selectedLanguage,
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <IconSearch className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-foreground/70" />
          <Input
            type="search"
            placeholder={t("cardPicker.searchPlaceholder")}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedSet(CARD_SEARCH_ALL_SETS);
            }}
            className="pl-8"
          />
        </div>
        <CardSearchLanguageSelect
          value={selectedLanguage}
          onChange={(language) => {
            setSelectedLanguage(language);
            setSelectedSet(CARD_SEARCH_ALL_SETS);
          }}
        />
        <CardSearchSetSelect
          sets={sets}
          totalCount={totalCount}
          value={selectedSet}
          onChange={setSelectedSet}
        />
      </div>
      <div
        data-vaul-no-drag
        className="max-h-[50dvh] min-h-48 flex-1 overflow-y-auto rounded-lg border bg-muted/40 p-2"
      >
        {loading && <CardSearchResultSkeletonGrid />}
        {!loading && results.length === 0 && (
          <p className="py-8 text-center text-sm text-foreground/70">
            {query.trim().length === 0
              ? t("cardPicker.startTyping")
              : t("cardPicker.noCardsFound")}
          </p>
        )}
        {!loading && results.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {results.map((result) => (
              <CardSearchResultTile
                key={cardSearchResultKey(result)}
                card={result}
                disabled={disabled}
                onClick={() => onSelect(result)}
              />
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
