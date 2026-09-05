import { Button } from "@/components/ui/button";
import { DynamicPopover } from "@/components/ui/responsive-popover";
import { Slider } from "@/components/ui/slider";
import { useModuleCount } from "@/features/calibration/api/use-module-count";
import type { CardFilters } from "@/features/cards/types";
import { cn } from "@/lib/utils";
import { computeBinCount } from "@magic-vault/shared";
import {
  IconDownload,
  IconFilter,
  IconHelpCircle,
  IconX,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

const EMPTY_FILTERS: CardFilters = {
  colors: [],
  rarities: [],
  bins: [],
  needsAttention: false,
  showDownloaded: false,
  sets: [],
  minMatchPercent: 0,
};

const KNOWN_COLOR_ACTIVE: Record<string, string> = {
  W: "bg-amber-100 text-amber-900 border-amber-400",
  U: "bg-blue-700 text-white border-blue-800",
  B: "bg-neutral-900 text-white border-neutral-700",
  R: "bg-red-700 text-white border-red-800",
  G: "bg-green-700 text-white border-green-800",
  C: "bg-gray-600 text-white border-gray-700",
};

// Rarity swatch colors (index.css) are fixed regardless of light/dark theme,
// so the text color needs to be picked per swatch's own lightness rather
// than tied to the app's theme like text-foreground/text-background would be.
const RARITY_TEXT_CLASS: Record<string, string> = {
  common: "text-white",
  c: "text-white",
  uncommon: "text-black",
  u: "text-black",
  rare: "text-black",
  r: "text-black",
  mythic: "text-black",
  lr: "text-black",
  p: "text-black",
};

function toggle<T>(arr: T[], item: T): T[] {
  return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];
}

const chipBase =
  "cursor-pointer border transition-colors rounded text-xs font-bold";
const chipInactive =
  "border-border bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground";

interface CardFilterPopoverProps {
  activeFilters: CardFilters;
  onFiltersChange: (filters: CardFilters) => void;
  activeFilterCount: number;
  availableRarities: { key: string; label: string }[];
  availableColors: { key: string; label: string; bg: string }[];
}

export function CardFilterPopover({
  activeFilters,
  onFiltersChange,
  activeFilterCount,
  availableRarities,
  availableColors,
}: CardFilterPopoverProps) {
  const { t } = useTranslation("cards");
  const moduleCount = useModuleCount();
  const bins = Array.from({ length: computeBinCount(moduleCount) }, (_, i) => i + 1);

  return (
    <DynamicPopover
      trigger={
        <Button
          variant={activeFilterCount > 0 ? "secondary" : "outline"}
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
            <p className="text-[11px] font-medium text-muted-foreground tracking-wide mb-1.5 font-heading">
              {t("cardFilterPopover.color")}
            </p>
            <div className="flex flex-col gap-1">
              {availableColors.map((color) => {
                const active = activeFilters.colors.includes(color.key);
                const knownActiveClass = KNOWN_COLOR_ACTIVE[color.key];
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
            <p className="text-[11px] font-medium text-muted-foreground tracking-wide mb-1.5 font-heading">
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

        <div>
          <p className="text-[11px] font-medium text-muted-foreground tracking-wide mb-1.5 font-heading">
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

        <div>
          <p className="text-[11px] font-medium text-muted-foreground tracking-wide mb-1.5 font-heading flex items-center justify-between">
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
          <p className="text-[11px] font-medium text-muted-foreground tracking-wide mb-1.5 font-heading">
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
                ? "bg-amber-700 text-white border-amber-800"
                : chipInactive,
            )}
          >
            <IconHelpCircle className="size-3.5" />
            {t("cardFilterPopover.needsAttention")}
          </button>
        </div>

        <div>
          <p className="text-[11px] font-medium text-muted-foreground tracking-wide mb-1.5 font-heading">
            {t("cardFilterPopover.downloaded")}
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
            <p className="text-[11px] font-medium text-muted-foreground tracking-wide mb-1.5 font-heading">
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
            onClick={() => onFiltersChange(EMPTY_FILTERS)}
          >
            {t("cardFilterPopover.resetFilters")}
          </Button>
        )}
      </div>
    </DynamicPopover>
  );
}
