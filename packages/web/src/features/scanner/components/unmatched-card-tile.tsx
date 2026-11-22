import { Checkbox } from "@/components/ui/checkbox";
import { UnmatchedCardImage } from "@/features/scanner/components/unmatched-card-image";
import type { UnmatchedCardTileProps } from "@/lib/interfaces/scanner";
import { modifierClickSelectHandlers } from "@/lib/modifier-click-select";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export function UnmatchedCardTile({
  entry,
  onOpen,
  isSelected = false,
  onToggleSelect,
}: UnmatchedCardTileProps) {
  const { t } = useTranslation("scanner");
  const nearest = entry.diagnostics?.search?.candidates[0];
  const scannedAt = new Date(entry.scannedAt).toLocaleString();
  return (
    <div
      {...modifierClickSelectHandlers(onToggleSelect && (() => onToggleSelect()))}
      className={cn(
        "relative rounded-card bg-card p-1.5",
        isSelected && "ring-2 ring-primary ring-offset-1",
      )}
    >
      <button
        type="button"
        className="flex w-full cursor-pointer flex-col gap-1 text-left"
        onClick={onOpen}
      >
        <UnmatchedCardImage entry={entry} />
        <div className="flex min-w-0 items-center justify-between gap-2 px-1">
          <p className="truncate text-xs font-semibold uppercase">
            {entry.diagnostics
              ? t(`unmatchedCardsPanel.reasons.${entry.diagnostics.reason}`)
              : t("unmatchedCardsPanel.imageAlt")}
          </p>
          {entry.binNumber != null && (
            <p className="shrink-0 text-xs text-foreground/70">
              {t("mobileMonitor.bin", { number: entry.binNumber })}
            </p>
          )}
        </div>
        <p className="truncate px-1 pb-1 text-2xs text-foreground/70">
          {nearest?.name
            ? t("unmatchedCardsPanel.gridNearest", { name: nearest.name })
            : scannedAt}
        </p>
      </button>
      {onToggleSelect && (
        <span className="absolute top-2 right-2 z-30 flex size-6 items-center justify-center rounded-md bg-background/80 shadow-sm backdrop-blur-sm">
          <Checkbox
            checked={isSelected}
            aria-label={t("unmatchedCardsPanel.selection.selectScan", { scannedAt })}
            onCheckedChange={onToggleSelect}
          />
        </span>
      )}
    </div>
  );
}
