import { Button } from "@/components/ui/button";
import { DynamicPopover } from "@/components/ui/responsive-popover";
import { Slider } from "@/components/ui/slider";
import type { CardFilters } from "@/lib/interfaces/cards";
import { EMPTY_CARD_FILTERS } from "@/lib/constants/card-filters";
import { CARD_COLOR_ACTIVE_CLASS } from "@/lib/constants/colors";
import { RARITY_TEXT_CLASS } from "@/lib/constants/rarity";
import { cn } from "@/lib/utils";
import {
  IconDownload,
  IconFilter,
  IconHelpCircle,
  IconX,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

function toggle<T>(arr: T[], item: T): T[] {
  return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];
}

const chipBase =
  "cursor-pointer border transition-colors rounded text-xs font-bold";
const chipInactive =
  "border-border bg-transparent text-foreground/70 hover:bg-muted hover:text-foreground";

interface CardFilterPopoverProps {
  activeFilters: CardFilters;
  onFiltersChange: (filters: CardFilters) => void;
  activeFilterCount: number;
  availableRarities: { key: string; label: string }[];
  availableColors: { key: string; label: string; bg: string }[];
  availableFoilTypes: { key: string; label: string }[];
  binCount?: number;
}

export function CardFilterPopover({
  activeFilters,
  onFiltersChange,
  activeFilterCount,
  availableRarities,
  availableColors,
  availableFoilTypes,
  binCount,
}: CardFilterPopoverProps) {
  const { t } = useTranslation("cards");
  const bins = Array.from({ length: binCount ?? 0 }, (_, i) => i + 1);

  return (
    <DynamicPopover
      trigger={
        <Button
          variant={activeFilterCount > 0 ? "outline-selected" : "outline"}
          size="icon"
          className="shrink-0"
        >
          <IconFilter className="size-4" />
        </Button>
      }
      side="bottom"
      align="end"
    >
      <div className="flex flex-col gap-3">
        {availableColors.length > 0 && (
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-foreground/70 mb-1.5">
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
                    onClick={() =>
                      onFiltersChange({
                        ...activeFilters,
                        colors: toggle(activeFilters.colors, color.key),
                      })
                    }
                    className={cn(
                      chipBase,
                      "flex items-center gap-1.5 px-2 h-7 font-medium",
                      active
                        ? (knownActiveClass ??
                            "border-transparent text-background")
                        : chipInactive,
                    )}
                    style={
                      active && !knownActiveClass
                        ? { backgroundColor: color.bg }
                        : undefined
                    }
                  >
                    <span
                      className="size-2 rounded-full shrink-0 border border-border/50"
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
            <p className="text-xs font-medium uppercase tracking-wide text-foreground/70 mb-1.5">
              {t("cardFilterPopover.rarity")}
            </p>
            <div className="flex flex-col gap-1">
              {availableRarities.map((rarity) => {
                const active = activeFilters.rarities.includes(rarity.key);
                return (
                  <button
                    key={rarity.key}
                    type="button"
                    onClick={() =>
                      onFiltersChange({
                        ...activeFilters,
                        rarities: toggle(activeFilters.rarities, rarity.key),
                      })
                    }
                    className={cn(
                      chipBase,
                      "flex items-center gap-1.5 px-2 h-7 font-medium",
                      active
                        ? cn(
                            "border-transparent",
                            RARITY_TEXT_CLASS[rarity.key] ?? "text-foreground",
                          )
                        : chipInactive,
                    )}
                    style={
                      active
                        ? { backgroundColor: `var(--${rarity.key})` }
                        : undefined
                    }
                  >
                    <span
                      className="size-2 rounded-full shrink-0"
                      style={{ backgroundColor: `var(--${rarity.key})` }}
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
            <p className="text-xs font-medium uppercase tracking-wide text-foreground/70 mb-1.5">
              {t("cardFilterPopover.foilType")}
            </p>
            <div className="flex flex-col gap-1">
              {availableFoilTypes.map((foilType) => {
                const active = activeFilters.foilTypes.includes(foilType.key);
                return (
                  <button
                    key={foilType.key}
                    type="button"
                    onClick={() =>
                      onFiltersChange({
                        ...activeFilters,
                        foilTypes: toggle(activeFilters.foilTypes, foilType.key),
                      })
                    }
                    className={cn(
                      chipBase,
                      "flex items-center gap-1.5 px-2 h-7 font-medium",
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

        {binCount !== undefined && (
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-foreground/70 mb-1.5">
              {t("cardFilterPopover.bin")}
            </p>
            <div className="flex gap-1 flex-wrap">
              {bins.map((bin) => {
                const active = activeFilters.bins.includes(bin);
                return (
                  <button
                    key={bin}
                    type="button"
                    onClick={() =>
                      onFiltersChange({
                        ...activeFilters,
                        bins: toggle(activeFilters.bins, bin),
                      })
                    }
                    className={cn(
                      chipBase,
                      "size-7",
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
                onClick={() =>
                  onFiltersChange({
                    ...activeFilters,
                    bins: toggle(activeFilters.bins, null),
                  })
                }
                className={cn(
                  chipBase,
                  "size-7",
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
          <p className="text-xs font-medium uppercase tracking-wide text-foreground/70 mb-1.5 flex items-center justify-between">
            <span>{t("cardFilterPopover.minMatch")}</span>
            <span className="text-foreground font-semibold">
              {activeFilters.minMatchPercent}%
            </span>
          </p>
          <Slider
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
          <p className="text-xs font-medium uppercase tracking-wide text-foreground/70 mb-1.5">
            {t("cardFilterPopover.status")}
          </p>
          <button
            type="button"
            onClick={() =>
              onFiltersChange({
                ...activeFilters,
                needsAttention: !activeFilters.needsAttention,
              })
            }
            className={cn(
              chipBase,
              "flex items-center gap-1.5 px-2 h-7",
              activeFilters.needsAttention
                ? "bg-warning-strong text-white border-warning-strong"
                : chipInactive,
            )}
          >
            <IconHelpCircle className="size-3.5" />
            {t("cardFilterPopover.needsAttention")}
          </button>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-foreground/70 mb-1.5">
            {t("downloaded")}
          </p>
          <button
            type="button"
            onClick={() =>
              onFiltersChange({
                ...activeFilters,
                showDownloaded: !activeFilters.showDownloaded,
              })
            }
            className={cn(
              chipBase,
              "flex items-center gap-1.5 px-2 h-7",
              activeFilters.showDownloaded
                ? "bg-primary text-primary-foreground border-primary"
                : chipInactive,
            )}
          >
            <IconDownload className="size-3.5" />
            {t("cardFilterPopover.showDownloadedCards")}
          </button>
        </div>

        {activeFilters.sets.length > 0 && (
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-foreground/70 mb-1.5">
              {t("cardFilterPopover.sets")}
            </p>
            <div className="flex gap-1 flex-wrap">
              {activeFilters.sets.map((setCode) => (
                <button
                  key={setCode}
                  type="button"
                  onClick={() =>
                    onFiltersChange({
                      ...activeFilters,
                      sets: toggle(activeFilters.sets, setCode),
                    })
                  }
                  className={cn(
                    chipBase,
                    "flex items-center gap-1 px-2 h-7 uppercase bg-primary text-primary-foreground border-primary",
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
            size="sm"
            className="w-full"
            onClick={() => onFiltersChange(EMPTY_CARD_FILTERS)}
          >
            {t("cardFilterPopover.resetFilters")}
          </Button>
        )}
      </div>
    </DynamicPopover>
  );
}
