import { useCardDetailCollection } from "@/features/cards/api/use-card-detail-scope";
import { MTG_ASPECT_RATIO } from "@/lib/constants/scanner";
import type {
  OcrRegionCropsProps,
  RegionCropProps,
} from "@/lib/interfaces/cards";
import { cn } from "@/lib/utils";
import {
  OCR_REGIONS_BY_GAME_KEY,
  type OcrOverlayRegion,
} from "@magic-vault/shared";
import { useTranslation } from "react-i18next";

function RegionCrop({ src, label, region }: RegionCropProps) {
  return (
    <figure className="flex flex-col gap-1.5">
      <figcaption className="text-xs font-medium">{label}</figcaption>
      <div
        className="relative w-full overflow-hidden rounded-md border bg-muted"
        style={{
          aspectRatio: `${(region.width * MTG_ASPECT_RATIO) / region.height}`,
        }}
      >
        <img
          src={src}
          alt={label}
          className="absolute max-w-none object-fill"
          style={{
            width: `${100 / region.width}%`,
            height: `${100 / region.height}%`,
            left: `${(-region.x / region.width) * 100}%`,
            top: `${(-region.y / region.height) * 100}%`,
          }}
        />
      </div>
    </figure>
  );
}

export function OcrRegionCrops({
  src,
  className,
  regions: regionsOverride,
  printingMarks = [],
}: OcrRegionCropsProps) {
  const { t } = useTranslation("cards");
  const collection = useCardDetailCollection();
  const gameKey = collection?.game?.key;
  const regions: OcrOverlayRegion[] =
    regionsOverride ??
    (gameKey ? (OCR_REGIONS_BY_GAME_KEY[gameKey] ?? []) : []);

  if (regions.length === 0 && printingMarks.length === 0) {
    return (
      <p className="text-xs text-foreground/70">
        {t("cardDetailPanel.noOcrRegions")}
      </p>
    );
  }

  const regionLabel = (region: OcrOverlayRegion) => {
    const field = t(`cardDetailPanel.ocrFields.${region.field}`);
    if (region.fallback) return t("cardDetailPanel.ocrFallback", { field });
    if (region.anchored === false) {
      return t("cardDetailPanel.ocrFixedBox", { field });
    }
    return field;
  };

  return (
    <div className={cn("flex flex-col gap-3 md:gap-2", className)}>
      {regions.map((region, i) => (
        <RegionCrop
          key={`${region.field}-${i}`}
          src={src}
          label={regionLabel(region)}
          region={region}
        />
      ))}
      {printingMarks.length > 0 && (
        <p className="text-xs text-foreground/70">
          {t("cardDetailPanel.printingMarks.title")}
        </p>
      )}
      {printingMarks.map((mark) => (
        <RegionCrop
          key={mark.key}
          src={src}
          label={t(`cardDetailPanel.printingMarks.${mark.key}`)}
          region={mark}
        />
      ))}
    </div>
  );
}
