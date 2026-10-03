import { CARD_GRID_DENSITIES } from "@/lib/constants/card-grid";
import { DeleteDialog } from "@/components/delete-dialog";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Input } from "@/components/ui/input";
import { WatcherStack } from "@/components/ui/watcher-stack";
import { CardFilterPopover } from "@/features/cards/components/card-filter-popover";
import { ClearCardQueryButton } from "@/features/cards/components/clear-card-query-button";
import { EMPTY_CARD_FILTERS } from "@/lib/constants/card-filters";
import { CardSortButton } from "@/features/cards/components/card-sort-button";
import type { CardToolbarProps } from "@/lib/interfaces/cards";
import {
  IconCheckbox,
  IconDownload,
  IconLayoutGrid,
  IconLayoutList,
  IconStack2,
  IconTrash,
  IconZoomIn,
  IconZoomOut,
  IconZoomReset,
} from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function CardToolbar({
  searchQuery,
  onSearchChange,
  sortKey,
  onSortChange,
  sortableFields,
  onExport,
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
    <div className="flex flex-row gap-2 items-center w-full">
      {leading}
      {watchers && watchers.length > 0 && <WatcherStack watchers={watchers} />}
      <Input
        placeholder={t("cardToolbar.searchPlaceholder")}
        data-hotkey-search
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        className="flex-1 min-w-0"
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
      <ClearCardQueryButton
        searchQuery={searchQuery}
        activeFilterCount={activeFilterCount}
        onClear={() => {
          onSearchChange("");
          onFiltersChange(EMPTY_CARD_FILTERS);
        }}
      />
      <ButtonGroup className="shrink-0">
        <Button
          variant={viewMode === "grid" ? "outline-selected" : "outline"}
          size="icon"
          onClick={() => onViewModeChange("grid")}
          title={t("cardToolbar.gridView")}
        >
          <IconLayoutGrid className="size-4" />
        </Button>
        <Button
          variant={viewMode === "list" ? "outline-selected" : "outline"}
          size="icon"
          onClick={() => onViewModeChange("list")}
          title={t("cardToolbar.listView")}
        >
          <IconLayoutList className="size-4" />
        </Button>
      </ButtonGroup>
      {viewMode === "grid" && density && onDensityChange && (
        <Button
          variant="outline"
          size="icon"
          className="shrink-0"
          onClick={() =>
            onDensityChange(
              CARD_GRID_DENSITIES[
                (CARD_GRID_DENSITIES.indexOf(density) + 1) %
                  CARD_GRID_DENSITIES.length
              ],
            )
          }
          title={t("cardToolbar.density", {
            density: t(`cardToolbar.densities.${density}`),
          })}
        >
          {density === "compact" ? (
            <IconZoomOut className="size-4" />
          ) : density === "large" ? (
            <IconZoomIn className="size-4" />
          ) : (
            <IconZoomReset className="size-4" />
          )}
        </Button>
      )}
      <Button
        variant={groupDuplicates ? "outline-selected" : "outline"}
        size="icon"
        className="shrink-0"
        onClick={() => onGroupDuplicatesChange(!groupDuplicates)}
        title={t("cardToolbar.groupDuplicates")}
      >
        <IconStack2 className="size-4" />
      </Button>
      {onToggleSelectAll && (
        <Button
          variant="outline"
          size="icon"
          onClick={onToggleSelectAll}
          disabled={!hasCards}
          className="shrink-0"
          title={
            allSelected
              ? t("cardToolbar.deselectAll")
              : t("cardToolbar.selectAll")
          }
        >
          <IconCheckbox className="size-4" />
        </Button>
      )}
      {(onExport || onClearAll) && (
        <ButtonGroup>
          <Button
            variant="outline"
            size="icon"
            onClick={onExport}
            disabled={!hasCards}
            className="shrink-0"
            title={t("cardToolbar.sessionSummaryExport")}
            data-tour="export-collection"
          >
            <IconDownload className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setClearAllDialogOpen(true)}
            disabled={!hasCards}
            className="shrink-0"
            title={t("cardToolbar.clearAllCardsTitle")}
          >
            <IconTrash className="size-4" />
          </Button>
        </ButtonGroup>
      )}
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
