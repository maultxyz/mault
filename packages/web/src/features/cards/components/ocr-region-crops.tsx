import { useCollections } from "@/features/collections/api/use-collections";
import { MTG_ASPECT_RATIO } from "@/lib/constants/scanner";
import type { OcrRegionCropsProps } from "@/lib/interfaces/cards";
import { cn } from "@/lib/utils";
import { OCR_REGIONS_BY_GAME_KEY } from "@magic-vault/shared";
import { useTranslation } from "react-i18next";

export function OcrRegionCrops({ src, className }: OcrRegionCropsProps) {
  const { t } = useTranslation("cards");
  const { activeCollection } = useCollections();
  const gameKey = activeCollection?.game?.key;
  const regions = gameKey ? (OCR_REGIONS_BY_GAME_KEY[gameKey] ?? []) : [];

  if (regions.length === 0) {
    return (
      <p className="text-xs text-foreground/70">
        {t("cardDetailPanel.noOcrRegions")}
      </p>
    );
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {regions.map((region, i) => (
        <figure key={`${region.field}-${i}`} className="flex flex-col gap-1.5">
          <figcaption className="text-xs font-medium">
            {t(`cardDetailPanel.ocrFields.${region.field}`)}
          </figcaption>
          <div
            className="relative w-full overflow-hidden rounded-md border bg-muted"
            style={{
              aspectRatio: `${(region.width * MTG_ASPECT_RATIO) / region.height}`,
            }}
          >
            <img
              src={src}
              alt={t(`cardDetailPanel.ocrFields.${region.field}`)}
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
      ))}
    </div>
  );
}
