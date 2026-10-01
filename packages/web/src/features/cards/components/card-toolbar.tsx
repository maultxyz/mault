import { DeleteDialog } from "@/components/delete-dialog";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Input } from "@/components/ui/input";
import { WatcherStack } from "@/components/ui/watcher-stack";
import { CardFilterPopover } from "@/features/cards/components/card-filter-popover";
import { CardSortButton } from "@/features/cards/components/card-sort-button";
import type { CardToolbarProps } from "@/lib/interfaces/cards";
import {
  IconCheckbox,
  IconDownload,
  IconLayoutGrid,
  IconLayoutList,
  IconStack2,
  IconTrash,
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
