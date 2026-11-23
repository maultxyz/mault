import {
  CardFilterCheckboxGroup,
  CardFilterRadioGroup,
} from "@/components/card-filter-groups";
import { Button } from "@/components/ui/button";
import { CardPriceRangeFilter } from "@/features/cards/components/card-price-range-filter";
import { PUBLIC_CARD_FILTER_SEARCHABLE_MIN_OPTIONS } from "@/lib/constants/public-cards";
import { Slider } from "@/components/ui/slider";
import { CARD_COLOR_ACTIVE_CLASS } from "@/lib/constants/colors";
import { cn } from "@/lib/utils";
import {
  IconCoins,
  IconDownload,
  IconHelpCircle,
  IconQuestionMark,
  IconX,
} from "@tabler/icons-react";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import {
  CARD_CONDITIONS,
  EMPTY_CARD_FILTERS,
  isCardCondition,
  LANGUAGE_LABELS,
  type PublicCardFinish,
} from "@magic-vault/shared";
import type { CardFilterFieldsProps } from "@/lib/interfaces/cards";

function toggle<T>(arr: T[], item: T): T[] {
  return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];
}

const chipBase =
  "cursor-pointer border transition-colors rounded-md text-xs font-bold max-md:rounded-lg max-md:text-sm max-md:font-semibold";
const chipInactive =
  "border-border bg-transparent text-foreground/70 hover:bg-foreground/6 hover:text-foreground max-md:border-transparent max-md:bg-foreground/6 max-md:text-foreground";

export function CardFilterFields({
  activeFilters,
  onFiltersChange,
  activeFilterCount,
  availableRarities,
  availableColors,
  availableFoilTypes,
  filterFacets,
  binCount,
  unmatchedCount = 0,
  onShowUnmatched,
  openBuyGuid,
}: CardFilterFieldsProps) {
  const { t } = useTranslation("cards");
  const bins = Array.from({ length: binCount ?? 0 }, (_, i) => i + 1);
  const minMatchLabelId = useId();
  const conditionOptions = [...(filterFacets?.conditions ?? [])]
    .sort(
      (left, right) =>
        CARD_CONDITIONS.indexOf(left.key as (typeof CARD_CONDITIONS)[number]) -
        CARD_CONDITIONS.indexOf(right.key as (typeof CARD_CONDITIONS)[number]),
    )
    .map(({ key, count }) => ({
      key,
      label: isCardCondition(key) ? t(`condition.names.${key}`) : key,
      count,
    }));
  const finishOptions: { key: PublicCardFinish; label: string; count?: number }[] = [
    { key: "all", label: t("publicBrowse.finishAll") },
    { key: "nonfoil", label: t("publicBrowse.finishNonFoil"), count: filterFacets?.nonFoilCount },
    { key: "foil", label: t("publicBrowse.finishFoil"), count: filterFacets?.foilCount },
  ];

  return (
    <div className="flex flex-col gap-3 md:gap-2">
      {availableColors.length > 0 && (
        <div>
          <p className="text-xs font-medium text-foreground/70 mb-1.5 max-md:mb-2 max-md:text-sm max-md:font-semibold max-md:text-foreground">
            {t("cardFilterPopover.color")}
          </p>
          <div className="flex flex-col gap-1">
            {availableColors.map((color) => {
              const active = activeFilters.colors.includes(color.key);
              const knownActiveClass = CARD_COLOR_ACTIVE_CLASS[color.key];
              return (
                <button
                  key={color.key}
                  type="button"
                  aria-pressed={active}
                  onClick={() =>
                    onFiltersChange({
                      ...activeFilters,
                      colors: toggle(activeFilters.colors, color.key),
                    })
                  }
                  className={cn(
                    chipBase,
                    "flex items-center gap-1.5 px-2 h-7 max-md:h-9 max-md:px-3 font-medium",
                    active
                      ? (knownActiveClass ??
                          cn("border-transparent", color.textClass))
                      : chipInactive,
                  )}
                  style={
                    active && !knownActiveClass
                      ? { backgroundColor: color.bg }
                      : undefined
                  }
                >
                  <span
                    className="size-2 rounded-full shrink-0 border border-border"
                    style={{ backgroundColor: color.bg }}
                  />
                  {color.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {availableRarities.length > 0 && (
        <div>
          <p className="text-xs font-medium text-foreground/70 mb-1.5 max-md:mb-2 max-md:text-sm max-md:font-semibold max-md:text-foreground">
            {t("cardFilterPopover.rarity")}
          </p>
          <div className="flex flex-col gap-1">
            {availableRarities.map((rarity) => {
              const active = activeFilters.rarities.includes(rarity.key);
              return (
                <button
                  key={rarity.key}
                  type="button"
                  aria-pressed={active}
                  onClick={() =>
                    onFiltersChange({
                      ...activeFilters,
                      rarities: toggle(activeFilters.rarities, rarity.key),
                    })
                  }
                  className={cn(
                    chipBase,
                    "flex items-center gap-1.5 px-2 h-7 max-md:h-9 max-md:px-3 font-medium",
                    active
                      ? cn("border-transparent", rarity.textClass)
                      : chipInactive,
                  )}
                  style={active ? { backgroundColor: rarity.bg } : undefined}
                >
                  <span
                    className="size-2 rounded-full shrink-0"
                    style={{ backgroundColor: rarity.bg }}
                  />
                  {rarity.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {availableFoilTypes.length > 0 && (
        <div>
          <p className="text-xs font-medium text-foreground/70 mb-1.5 max-md:mb-2 max-md:text-sm max-md:font-semibold max-md:text-foreground">
            {t("cardFilterPopover.foilType")}
          </p>
          <div className="flex flex-col gap-1">
            {availableFoilTypes.map((foilType) => {
              const active = activeFilters.foilTypes.includes(foilType.key);
              return (
                <button
                  key={foilType.key}
                  type="button"
                  aria-pressed={active}
                  onClick={() =>
                    onFiltersChange({
                      ...activeFilters,
                      foilTypes: toggle(activeFilters.foilTypes, foilType.key),
                    })
                  }
                  className={cn(
                    chipBase,
                    "flex items-center gap-1.5 px-2 h-7 max-md:h-9 max-md:px-3 font-medium",
                    active
                      ? "bg-primary text-primary-foreground border-primary"
                      : chipInactive,
                  )}
                >
                  {foilType.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {filterFacets && (
        <>
          <CardFilterRadioGroup
            legend={t("publicBrowse.finishFilter")}
            name="finish"
            value={activeFilters.finish}
            onChange={(finish) => onFiltersChange({ ...activeFilters, finish })}
            options={finishOptions}
          />
          <CardFilterCheckboxGroup
            legend={t("condition.label")}
            options={conditionOptions}
            selected={activeFilters.conditions}
            onChange={(conditions) => onFiltersChange({ ...activeFilters, conditions })}
          />
          {(filterFacets.languages.length > 1 || activeFilters.languages.length > 0) && (
            <CardFilterCheckboxGroup
              legend={t("publicBrowse.languageFilter")}
              options={filterFacets.languages.map(({ key, count }) => ({
                key,
                label: LANGUAGE_LABELS[key] ?? key,
                count,
              }))}
              selected={activeFilters.languages}
              onChange={(languages) => onFiltersChange({ ...activeFilters, languages })}
            />
          )}
          <CardPriceRangeFilter
            minPrice={activeFilters.minPrice}
            maxPrice={activeFilters.maxPrice}
            onChange={(range) => onFiltersChange({ ...activeFilters, ...range })}
          />
          <CardFilterCheckboxGroup
            legend={t("publicBrowse.setFilter")}
            searchPlaceholder={
              filterFacets.sets.length > PUBLIC_CARD_FILTER_SEARCHABLE_MIN_OPTIONS
                ? t("publicBrowse.findSet")
                : undefined
            }
            options={filterFacets.sets.filter(({ code }) => !!code).map(({ code, name, count }) => ({
              key: code,
              label: name || code,
              count,
            }))}
            selected={activeFilters.sets}
            onChange={(sets) => onFiltersChange({ ...activeFilters, sets })}
          />
        </>
      )}

      {binCount !== undefined && (
        <div>
          <p className="text-xs font-medium text-foreground/70 mb-1.5 max-md:mb-2 max-md:text-sm max-md:font-semibold max-md:text-foreground">
            {t("cardFilterPopover.bin")}
          </p>
          <div className="flex gap-1 flex-wrap">
            {bins.map((bin) => {
              const active = activeFilters.bins.includes(bin);
              return (
                <button
                  key={bin}
                  type="button"
                  aria-pressed={active}
                  aria-label={t("scannedCardItem.bin", { number: bin })}
                  onClick={() =>
                    onFiltersChange({
                      ...activeFilters,
                      bins: toggle(activeFilters.bins, bin),
                    })
                  }
                  className={cn(
                    chipBase,
                    "size-7 max-md:size-9",
                    active
                      ? "bg-primary text-primary-foreground border-primary"
                      : chipInactive,
                  )}
                >
                  {bin}
                </button>
              );
            })}
            <button
              type="button"
              aria-pressed={activeFilters.bins.includes(null)}
              aria-label={t("cardFilterPopover.unassigned")}
              onClick={() =>
                onFiltersChange({
                  ...activeFilters,
                  bins: toggle(activeFilters.bins, null),
                })
              }
              className={cn(
                chipBase,
                "size-7 max-md:size-9",
                activeFilters.bins.includes(null)
                  ? "bg-muted-foreground text-background border-muted-foreground"
                  : chipInactive,
              )}
              title={t("cardFilterPopover.unassigned")}
            >
              -
            </button>
          </div>
        </div>
      )}

      <div>
        <p className="text-xs font-medium text-foreground/70 mb-1.5 max-md:mb-2 max-md:text-sm max-md:font-semibold max-md:text-foreground flex items-center justify-between">
          <span id={minMatchLabelId}>{t("cardFilterPopover.minMatch")}</span>
          <span className="text-foreground font-semibold">
            {activeFilters.minMatchPercent}%
          </span>
        </p>
        <Slider
          aria-labelledby={minMatchLabelId}
          min={0}
          max={100}
          step={1}
          value={activeFilters.minMatchPercent}
          onValueChange={(value) =>
            onFiltersChange({
              ...activeFilters,
              minMatchPercent: value,
            })
          }
        />
      </div>

      <div>
        <p className="text-xs font-medium text-foreground/70 mb-1.5 max-md:mb-2 max-md:text-sm max-md:font-semibold max-md:text-foreground">
          {t("cardFilterPopover.status")}
        </p>
        <button
          type="button"
          aria-pressed={activeFilters.needsAttention}
          onClick={() =>
            onFiltersChange({
              ...activeFilters,
              needsAttention: !activeFilters.needsAttention,
            })
          }
          className={cn(
            chipBase,
            "flex items-center gap-1.5 px-2 h-7 max-md:h-9 max-md:px-3",
            activeFilters.needsAttention
              ? "bg-warning-strong text-white border-warning-strong"
              : chipInactive,
          )}
        >
          <IconHelpCircle className="size-3.5" />
          {t("cardFilterPopover.needsAttention")}
        </button>
      </div>

      {(openBuyGuid || activeFilters.intakeLotGuid) && (
        <div>
          <p className="text-xs font-medium text-foreground/70 mb-1.5 max-md:mb-2 max-md:text-sm max-md:font-semibold max-md:text-foreground">
            {t("cardFilterPopover.buy")}
          </p>
          <button
            type="button"
            aria-pressed={!!activeFilters.intakeLotGuid}
            onClick={() =>
              onFiltersChange({
                ...activeFilters,
                intakeLotGuid: activeFilters.intakeLotGuid
                  ? null
                  : (openBuyGuid ?? null),
              })
            }
            className={cn(
              chipBase,
              "flex items-center gap-1.5 px-2 h-7 max-md:h-9 max-md:px-3",
              activeFilters.intakeLotGuid
                ? "bg-primary text-primary-foreground border-primary"
                : chipInactive,
            )}
          >
            <IconCoins className="size-3.5" />
            {t("cardFilterPopover.onlyThisBuy")}
          </button>
        </div>
      )}

      {onShowUnmatched && unmatchedCount > 0 && (
        <div>
          <p className="text-xs font-medium text-foreground/70 mb-1.5 max-md:mb-2 max-md:text-sm max-md:font-semibold max-md:text-foreground">
            {t("cardFilterPopover.unmatched")}
          </p>
          <button
            type="button"
            title={t("cardToolbar.showUnmatched")}
            onClick={onShowUnmatched}
            className={cn(
              chipBase,
              chipInactive,
              "flex items-center gap-1.5 px-2 h-7 max-md:h-9 max-md:px-3",
            )}
          >
            <IconQuestionMark className="size-3.5 text-destructive" />
            {t("cardToolbar.unmatchedCount", { count: unmatchedCount })}
          </button>
        </div>
      )}

      <div>
        <p className="text-xs font-medium text-foreground/70 mb-1.5 max-md:mb-2 max-md:text-sm max-md:font-semibold max-md:text-foreground">
          {t("downloaded")}
        </p>
        <button
          type="button"
          aria-pressed={activeFilters.hideDownloaded}
          onClick={() =>
            onFiltersChange({
              ...activeFilters,
              hideDownloaded: !activeFilters.hideDownloaded,
            })
          }
          className={cn(
            chipBase,
            "flex items-center gap-1.5 px-2 h-7 max-md:h-9 max-md:px-3",
            activeFilters.hideDownloaded
              ? "bg-primary text-primary-foreground border-primary"
              : chipInactive,
          )}
        >
          <IconDownload className="size-3.5" />
          {t("cardFilterPopover.hideDownloadedCards")}
        </button>
      </div>

      {!filterFacets && activeFilters.sets.length > 0 && (
        <div>
          <p className="text-xs font-medium text-foreground/70 mb-1.5 max-md:mb-2 max-md:text-sm max-md:font-semibold max-md:text-foreground">
            {t("cardFilterPopover.sets")}
          </p>
          <div className="flex gap-1 flex-wrap">
            {activeFilters.sets.map((setCode) => (
              <button
                key={setCode}
                type="button"
                aria-label={t("common:a11y.removeItem", { name: setCode })}
                onClick={() =>
                  onFiltersChange({
                    ...activeFilters,
                    sets: toggle(activeFilters.sets, setCode),
                  })
                }
                className={cn(
                  chipBase,
                  "flex items-center gap-1 px-2 h-7 max-md:h-9 max-md:px-3 uppercase bg-primary text-primary-foreground border-primary",
                )}
              >
                {setCode}
                <IconX className="size-3" />
              </button>
            ))}
          </div>
        </div>
      )}

      {activeFilterCount > 0 && (
        <Button
          variant="ghost"
          className="w-full"
          onClick={() => onFiltersChange(EMPTY_CARD_FILTERS)}
        >
          {t("cardFilterPopover.resetFilters")}
        </Button>
      )}
    </div>
  );
}
