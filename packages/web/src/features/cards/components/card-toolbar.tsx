import { CARD_GRID_DENSITIES } from "@/lib/constants/card-grid";
import { DeleteDialog } from "@/components/delete-dialog";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Input } from "@/components/ui/input";
import { WatcherStack } from "@/components/ui/watcher-stack";
import { CardFilterPopover } from "@/features/cards/components/card-filter-popover";
import { ClearCardQueryButton } from "@/features/cards/components/clear-card-query-button";
import { CardSortButton } from "@/features/cards/components/card-sort-button";
import type { CardToolbarProps } from "@/lib/interfaces/cards";
import {
  IconCheckbox,
  IconDownload,
  IconLayoutGrid,
  IconLayoutList,
  IconListCheck,
  IconSearch,
  IconStack2,
  IconTrash,
  IconZoomIn,
  IconZoomOut,
  IconZoomReset,
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
}: CardToolbarProps) {
  const { t } = useTranslation("cards");
  const [clearAllDialogOpen, setClearAllDialogOpen] = useState(false);

  const handleClear = () => {
    onClearAll?.();
  };

  return (
    <div className="w-full">
      <div className="flex flex-col gap-2">
        <div className="flex flex-row gap-2 items-center min-w-0">
          {leading}
          {watchers && watchers.length > 0 && (
            <WatcherStack watchers={watchers} />
          )}
          <div className="relative flex-1 min-w-0">
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
          <CardSortButton
            sortKey={sortKey}
            onSortChange={onSortChange}
            sortableFields={sortableFields}
          />
          <CardFilterPopover
            activeFilters={activeFilters}
            onFiltersChange={onFiltersChange}
            activeFilterCount={activeFilterCount}
            availableRarities={availableRarities ?? []}
            availableColors={availableColors ?? []}
            availableFoilTypes={availableFoilTypes ?? []}
            binCount={binCount}
          />
        </div>
        <div className="flex flex-row flex-wrap gap-2 items-center justify-end">
          <ButtonGroup className="shrink-0">
            <Button
              variant={viewMode === "grid" ? "outline-selected" : "outline"}
              onClick={() => onViewModeChange("grid")}
            >
              <IconLayoutGrid />
              {t("cardToolbar.gridView")}
            </Button>
            <Button
              variant={viewMode === "list" ? "outline-selected" : "outline"}
              onClick={() => onViewModeChange("list")}
            >
              <IconLayoutList />
              {t("cardToolbar.listView")}
            </Button>
          </ButtonGroup>
          {viewMode === "grid" && density && onDensityChange && (
            <Button
              variant="outline"
              className="shrink-0"
              onClick={() =>
                onDensityChange(
                  CARD_GRID_DENSITIES[
                    (CARD_GRID_DENSITIES.indexOf(density) + 1) %
                      CARD_GRID_DENSITIES.length
                  ],
                )
              }
            >
              {density === "compact" ? (
                <IconZoomOut />
              ) : density === "large" ? (
                <IconZoomIn />
              ) : (
                <IconZoomReset />
              )}
              {t("cardToolbar.density", {
                density: t(`cardToolbar.densities.${density}`),
              })}
            </Button>
          )}
          <Button
            variant={groupDuplicates ? "outline-selected" : "outline"}
            className="shrink-0"
            onClick={() => onGroupDuplicatesChange(!groupDuplicates)}
          >
            <IconStack2 />
            {t("cardToolbar.groupDuplicates")}
          </Button>
          {onToggleSelectAll && (
            <Button
              variant="outline"
              onClick={onToggleSelectAll}
              disabled={!hasCards}
              className="shrink-0"
            >
              <IconCheckbox />
              {allSelected
                ? t("cardToolbar.deselectAll")
                : t("cardToolbar.selectAll")}
            </Button>
          )}
          {onStartReview && (
            <Button
              variant="outline"
              onClick={onStartReview}
              disabled={!hasCards}
              className="shrink-0"
              title={t("cardToolbar.reviewCards")}
            >
              <IconListCheck />
              {t("cardToolbar.review")}
            </Button>
          )}
          {(onExport || onClearAll) && (
            <ButtonGroup>
              <Button
                variant="outline"
                onClick={onExport}
                disabled={!hasCards}
                className="shrink-0"
                title={t("cardToolbar.sessionSummaryExport")}
                data-tour="export-collection"
              >
                <IconDownload />
                {t("cardToolbar.export")}
              </Button>
              <Button
                variant="outline"
                onClick={() => setClearAllDialogOpen(true)}
                disabled={!hasCards}
                className="shrink-0"
                title={t("cardToolbar.clearAllCardsTitle")}
              >
                <IconTrash />
                {t("cardToolbar.clearAll")}
              </Button>
            </ButtonGroup>
          )}
        </div>
      </div>
      <DeleteDialog
        open={clearAllDialogOpen}
        onOpenChange={setClearAllDialogOpen}
        title={t("cardToolbar.deleteScannedCardsTitle")}
        description={t("cardToolbar.deleteScannedCardsDescription")}
        confirm={cardCount > 100 ? { type: "keyword" } : { type: "simple" }}
        confirmLabel={t("cardToolbar.clearAll")}
        onConfirm={handleClear}
      />
    </div>
  );
}
