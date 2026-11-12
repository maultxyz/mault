import { useCardDetailCollection } from "@/features/cards/api/use-card-detail-scope";
import type {
  OcrRegionOverlayProps,
} from "@/lib/interfaces/cards";
import { cn } from "@/lib/utils";
import {
  OCR_REGIONS_BY_GAME_KEY,
  type OcrOverlayRegion,
} from "@magic-vault/shared";
import { useTranslation } from "react-i18next";

export function OcrRegionOverlay({
  showLabels = false,
  regions: regionsOverride,
  printingMarks = [],
}: OcrRegionOverlayProps) {
  const { t } = useTranslation("cards");
  const collection = useCardDetailCollection();
  const gameKey = collection?.game?.key;
  const regions: OcrOverlayRegion[] =
    regionsOverride ??
    (gameKey ? (OCR_REGIONS_BY_GAME_KEY[gameKey] ?? []) : []);

  if (regions.length === 0 && printingMarks.length === 0) return null;

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {regions.map((region, i) => {
        const field = t(`cardDetailPanel.ocrFields.${region.field}`);
        return (
          <div
            key={`${region.field}-${i}`}
            className={cn(
              "absolute border",
              region.fallback
                ? "border-dashed border-warning bg-warning/10"
                : "border-primary bg-primary/10",
              region.anchored === false && "border-dotted",
            )}
            style={{
              left: `${region.x * 100}%`,
              top: `${region.y * 100}%`,
              width: `${region.width * 100}%`,
              height: `${region.height * 100}%`,
            }}
          >
            {showLabels && (
              <span
                className={cn(
                  "absolute left-0 top-full mt-px whitespace-nowrap rounded-sm px-1 text-2xs font-medium leading-tight",
                  region.fallback
                    ? "bg-warning-strong text-white"
                    : "bg-primary text-primary-foreground",
                )}
              >
                {region.fallback
                  ? t("cardDetailPanel.ocrFallback", { field })
                  : region.anchored === false
                    ? t("cardDetailPanel.ocrFixedBox", { field })
                    : field}
              </span>
            )}
          </div>
        );
      })}
      {printingMarks.map((mark) => (
        <div
          key={mark.key}
          className="absolute border border-info-strong bg-info/10"
          style={{
            left: `${mark.x * 100}%`,
            top: `${mark.y * 100}%`,
            width: `${mark.width * 100}%`,
            height: `${mark.height * 100}%`,
          }}
        >
          {showLabels && (
            <span className="absolute left-0 top-full mt-px whitespace-nowrap rounded-sm bg-info-strong px-1 text-2xs font-medium leading-tight text-white">
              {t(`cardDetailPanel.printingMarks.${mark.key}`)}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
