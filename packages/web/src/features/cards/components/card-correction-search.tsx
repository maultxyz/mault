import { CardTileSkeletonGrid } from "@/components/card-tile-skeleton-grid";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCardResultKeyboardNav } from "@/features/cards/api/use-card-result-keyboard-nav";
import { useCardSearch } from "@/features/cards/api/use-card-search";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { SEARCH_DEBOUNCE_MS } from "@/lib/constants/timing";
import type { CardCorrectionSearchProps } from "@/lib/interfaces/cards";
import { IconLoader2, IconSearch } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

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
  const [selectedSet, setSelectedSet] = useState<string | null>("all");
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
    selectedSet && selectedSet !== "all" ? selectedSet : undefined,
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
    setSelectedSet("all");
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
        {sets.length > 1 && (
          <Select
            value={selectedSet}
            onValueChange={(value) => setSelectedSet(value)}
          >
            <SelectTrigger className="w-40 shrink-0">
              <SelectValue placeholder={t("cardPicker.allSets")}>
                {selectedSet === "all"
                  ? t("cardPicker.allSetsCount", { count: totalCount })
                  : sets.find((s) => s.code === selectedSet)?.name}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {t("cardPicker.allSetsCount", { count: totalCount })}
              </SelectItem>
              {sets.map((s) => (
                <SelectItem key={s.code} value={s.code}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      <ScrollArea className="flex-1 overflow-y-auto min-h-48 border rounded-lg p-1 bg-sidebar">
        {loading && (
          <CardTileSkeletonGrid className="grid-cols-4 @3xl:grid-cols-5 gap-1.5" />
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
            className="grid grid-cols-4 @3xl:grid-cols-5 gap-1.5"
          >
            {results.map((card) => (
              <Button
                key={card.id}
                onKeyDown={onResultKeyDown}
                variant="ghost"
                disabled={disabled}
                className="relative w-full h-auto aspect-[2.5/3.5] p-0 rounded-md overflow-hidden group"
                onClick={(e) => onSelect(card, { stay: e.shiftKey })}
              >
                {card.image?.small ? (
                  <img
                    src={card.image.small}
                    alt={card.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-14 bg-muted rounded-md shrink-0" />
                )}
                <div className="absolute bottom-0 inset-x-0 bg-black/70 text-white text-2xs leading-tight px-1 py-0.5 text-center truncate">
                  {card.set.toUpperCase()} #{card.collectorNumber}
                </div>
              </Button>
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
