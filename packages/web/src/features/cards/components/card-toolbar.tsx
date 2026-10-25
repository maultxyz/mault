import { DeleteDialog } from "@/components/delete-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { WatcherStack } from "@/components/ui/watcher-stack";
import { CardViewOptionsDrawer } from "@/features/cards/components/card-view-options-drawer";
import { ClearCardQueryButton } from "@/features/cards/components/clear-card-query-button";
import type { CardToolbarProps } from "@/lib/interfaces/cards";
import {
  IconCheckbox,
  IconDots,
  IconDownload,
  IconListCheck,
  IconPlus,
  IconSearch,
  IconTrash,
} from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { EMPTY_CARD_FILTERS } from "@magic-vault/shared";

export function CardToolbar({
  searchQuery,
  onSearchChange,
  sortKey,
  onSortChange,
  sortableFields,
  onExport,
  onStartReview,
  needsReviewCount,
  onClearAll,
  hasCards,
  activeFilters,
  onFiltersChange,
  activeFilterCount,
  watchers,
  allSelected,
  onToggleSelectAll,
  availableRarities,
  availableColors,
  availableFoilTypes,
  binCount,
  cardCount,
  viewMode,
  onViewModeChange,
  density,
  onDensityChange,
  groupDuplicates,
  onGroupDuplicatesChange,
  leading,
  onAddCard,
}: CardToolbarProps) {
  const { t } = useTranslation("cards");
  const [clearAllDialogOpen, setClearAllDialogOpen] = useState(false);
  const hasMoreActions = !!onToggleSelectAll || !!onExport || !!onClearAll;
  const showReview = !!onStartReview && (needsReviewCount ?? 0) > 0;

  return (
    <div className="w-full">
      <div className="flex min-w-0 flex-row items-center gap-2">
        {leading}
        {watchers && watchers.length > 0 && (
          <WatcherStack watchers={watchers} />
        )}
        <div className="relative min-w-0 flex-1">
          <IconSearch className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-foreground/70" />
          <Input
            type="search"
            placeholder={t("cardToolbar.searchPlaceholder")}
            data-hotkey-search
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8"
          />
        </div>
        <ClearCardQueryButton
          searchQuery={searchQuery}
          activeFilterCount={activeFilterCount}
          onClear={() => {
            onSearchChange("");
            onFiltersChange(EMPTY_CARD_FILTERS);
          }}
        />
        <CardViewOptionsDrawer
          sortKey={sortKey}
          onSortChange={onSortChange}
          sortableFields={sortableFields}
          activeFilters={activeFilters}
          onFiltersChange={onFiltersChange}
          activeFilterCount={activeFilterCount}
          availableRarities={availableRarities ?? []}
          availableColors={availableColors ?? []}
          availableFoilTypes={availableFoilTypes ?? []}
          binCount={binCount}
          viewMode={viewMode}
          onViewModeChange={onViewModeChange}
          density={density}
          onDensityChange={onDensityChange}
          groupDuplicates={groupDuplicates}
          onGroupDuplicatesChange={onGroupDuplicatesChange}
        />
        {hasMoreActions && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  aria-label={t("cardToolbar.moreActions")}
                  title={t("cardToolbar.moreActions")}
                  data-tour="export-collection"
                />
              }
            >
              <IconDots />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {onToggleSelectAll && (
                <DropdownMenuItem
                  disabled={!hasCards}
                  onClick={onToggleSelectAll}
                >
                  <IconCheckbox />
                  {allSelected
                    ? t("cardToolbar.deselectAll")
                    : t("cardToolbar.selectAll")}
                </DropdownMenuItem>
              )}
              {onExport && (
                <DropdownMenuItem disabled={!hasCards} onClick={onExport}>
                  <IconDownload />
                  {t("cardToolbar.export")}
                </DropdownMenuItem>
              )}
              {onClearAll && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    disabled={!hasCards}
                    onClick={() => setClearAllDialogOpen(true)}
                  >
                    <IconTrash />
                    {t("cardToolbar.clearAll")}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {showReview && (
          <Button
            variant="outline"
            className="shrink-0"
            title={t("cardToolbar.reviewCards")}
            onClick={onStartReview}
          >
            <IconListCheck />
            {t("cardToolbar.reviewCount", { count: needsReviewCount })}
          </Button>
        )}
        {onAddCard && (
          <Button variant="outline" onClick={onAddCard} className="shrink-0">
            <IconPlus />
            {t("addCard.button")}
          </Button>
        )}
      </div>
      <DeleteDialog
        open={clearAllDialogOpen}
        onOpenChange={setClearAllDialogOpen}
        title={t("cardToolbar.deleteScannedCardsTitle")}
        description={t("cardToolbar.deleteScannedCardsDescription")}
        confirm={cardCount > 100 ? { type: "keyword" } : { type: "simple" }}
        confirmLabel={t("cardToolbar.clearAll")}
        onConfirm={() => onClearAll?.()}
      />
    </div>
  );
}
