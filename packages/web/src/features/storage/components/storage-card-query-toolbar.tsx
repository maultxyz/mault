import { MobileSearchInput } from "@/components/mobile-search-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CardViewOptionsDrawer } from "@/features/cards/components/card-view-options-drawer";
import { ClearCardQueryButton } from "@/features/cards/components/clear-card-query-button";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { MOBILE_ICON_BUTTON_CLASS } from "@/lib/constants/nav";
import type { StorageCardQueryToolbarProps } from "@/lib/interfaces/storage";
import { EMPTY_CARD_FILTERS } from "@magic-vault/shared";
import { IconCheckbox, IconSearch } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function StorageCardQueryToolbar({
  cardQuery,
  allSelected,
  canSelectAll,
  onToggleSelectAll,
  viewMode,
  onViewModeChange,
  density,
  onDensityChange,
}: StorageCardQueryToolbarProps) {
  const { t } = useTranslation("storage");
  const { t: tCards } = useTranslation("cards");
  const isMobile = useIsMobile();
  const {
    searchQuery,
    setSearchQuery,
    sortKey,
    setSortKey,
    sortableFields,
    filters,
    setFilters,
    activeFilterCount,
    stats,
  } = cardQuery;
  const hasQuery = !!searchQuery.trim() || activeFilterCount > 0;
  const iconButtonClassName = isMobile ? MOBILE_ICON_BUTTON_CLASS : undefined;

  return (
    <div className="flex min-w-0 items-center gap-1.5">
      {isMobile ? (
        <MobileSearchInput
          placeholder={t("cards.searchPlaceholder")}
          aria-label={t("cards.searchPlaceholder")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      ) : (
        <div className="relative min-w-0 flex-1">
          <IconSearch className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-foreground/70" />
          <Input
            type="search"
            placeholder={t("cards.searchPlaceholder")}
            aria-label={t("cards.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      )}
      {(!isMobile || hasQuery) && (
        <ClearCardQueryButton
          searchQuery={searchQuery}
          activeFilterCount={activeFilterCount}
          className={iconButtonClassName}
          onClear={() => {
            setSearchQuery("");
            setFilters(EMPTY_CARD_FILTERS);
          }}
        />
      )}
      <Button
        variant={allSelected ? "selected" : "outline"}
        size="icon"
        disabled={!canSelectAll}
        aria-pressed={allSelected}
        aria-label={tCards(
          allSelected ? "cardToolbar.deselectAll" : "cardToolbar.selectAll",
        )}
        title={tCards(
          allSelected ? "cardToolbar.deselectAll" : "cardToolbar.selectAll",
        )}
        className={iconButtonClassName}
        onClick={onToggleSelectAll}
      >
        <IconCheckbox />
      </Button>
      <CardViewOptionsDrawer
        sortKey={sortKey}
        onSortChange={setSortKey}
        sortableFields={sortableFields}
        defaultSortLabel={t("cards.positionOrder")}
        activeFilters={filters}
        onFiltersChange={setFilters}
        activeFilterCount={activeFilterCount}
        availableRarities={stats?.rarities ?? []}
        availableColors={stats?.colors ?? []}
        availableFoilTypes={stats?.foilTypes ?? []}
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
        density={density}
        onDensityChange={onDensityChange}
        triggerClassName={iconButtonClassName}
      />
    </div>
  );
}
