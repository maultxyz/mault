import { UnmatchedCardImage } from "@/features/scanner/components/unmatched-card-image";
import type { UnmatchedCardTileProps } from "@/lib/interfaces/scanner";
import { useTranslation } from "react-i18next";

export function UnmatchedCardTile({ entry, onOpen }: UnmatchedCardTileProps) {
  const { t } = useTranslation("scanner");
  const nearest = entry.diagnostics?.search?.candidates[0];
  return (
    <div className="relative rounded-lg border bg-muted p-1">
      <button
        type="button"
        className="flex w-full cursor-pointer flex-col gap-1 text-left"
        onClick={onOpen}
      >
        <UnmatchedCardImage entry={entry} className="border-0" />
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
            : new Date(entry.scannedAt).toLocaleString()}
        </p>
      </button>
    </div>
  );
}
