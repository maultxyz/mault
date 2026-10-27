import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCardResultKeyboardNav } from "@/features/cards/api/use-card-result-keyboard-nav";
import { useCardSearch } from "@/features/cards/api/use-card-search";
import { CardSearchLanguageSelect } from "@/features/cards/components/card-search-language-select";
import { CardSearchResultSkeletonGrid } from "@/features/cards/components/card-search-result-skeleton-grid";
import { CardSearchResultTile } from "@/features/cards/components/card-search-result-tile";
import { CardSearchSetSelect } from "@/features/cards/components/card-search-set-select";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { CARD_SEARCH_ALL_SETS } from "@/lib/constants/cards";
import { SEARCH_DEBOUNCE_MS } from "@/lib/constants/timing";
import type { CardCorrectionSearchProps } from "@/lib/interfaces/cards";
import { IconLoader2, IconSearch } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CARD_SEARCH_ALL_LANGUAGES,
  cardSearchResultKey,
} from "@magic-vault/shared";

export function CardCorrectionSearch({
  collectionGuid,
  initialQuery = "",
  capturedImage,
  disabled = false,
  onSelect,
  onCancel,
}: CardCorrectionSearchProps) {
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

  const { inputRef, gridRef, onInputKeyDown, onResultKeyDown } =
    useCardResultKeyboardNav({
      onSelect: (index, options) => {
        const card = results[index];
        if (card && !disabled) onSelect(card, options);
      },
      onCancel,
    });

  const handleInputChange = (value: string) => {
    setQuery(value);
    setSelectedSet(CARD_SEARCH_ALL_SETS);
  };

  return (
    <>
      {capturedImage && (
        <div className="flex items-center gap-4">
          <div className="w-56 aspect-[2.5/3.5] rounded-lg overflow-hidden border shadow-sm shrink-0">
            {capturedImage}
          </div>
          <p className="text-sm text-foreground/70 leading-snug">
            {t("cardDetailPanel.searchForCorrectVersion")}
          </p>
        </div>
      )}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <IconSearch className="absolute left-2 top-1/2 -translate-y-1/2 size-3 text-foreground/70" />
          <Input
            placeholder={t("cardPicker.searchPlaceholder")}
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={onInputKeyDown}
            ref={inputRef}
            className="pl-7"
            autoFocus
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
      <ScrollArea className="flex-1 overflow-y-auto min-h-48 border rounded-lg p-1 bg-sidebar">
        {loading && (
          <CardSearchResultSkeletonGrid className="grid-cols-3 gap-1.5" />
        )}
        {!loading && results.length === 0 && query.trim().length === 0 && (
          <p className="text-center text-sm text-foreground/70 py-8">
            {t("cardPicker.startTyping")}
          </p>
        )}
        {!loading && results.length === 0 && query.trim().length >= 2 && (
          <EmptyState
            size="compact"
            icon={IconSearch}
            title={t("cardPicker.noCardsFound")}
          />
        )}
        {!loading && results.length > 0 && (
          <div
            ref={gridRef}
            className="grid grid-cols-3 gap-1.5"
          >
            {results.map((card) => (
              <CardSearchResultTile
                key={cardSearchResultKey(card)}
                card={card}
                disabled={disabled}
                onKeyDown={onResultKeyDown}
                onClick={(e) => onSelect(card, { stay: e.shiftKey })}
              />
            ))}
          </div>
        )}
        {!loading && hasMore && (
          <div className="flex justify-center py-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadMore}
              disabled={isLoadingMore}
            >
              {isLoadingMore && <IconLoader2 className="animate-spin" />}
              {t("cardPicker.loadMore")}
            </Button>
          </div>
        )}
      </ScrollArea>
    </>
  );
}
