import { OcrRegionOverlay } from "@/features/cards/components/ocr-region-overlay";
import { gameCoverageQueryOptions } from "@/features/games/api/games";
import { OCR_REGIONS_BY_GAME_KEY } from "@magic-vault/shared";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

function percent(value: number) {
  return Math.round(value * 1000) / 10;
}

export function OcrRegionGallery() {
  const { t } = useTranslation("health");
  const { t: tCards } = useTranslation("cards");
  const { data: coverage = [] } = useQuery(gameCoverageQueryOptions);

  const games = Object.entries(OCR_REGIONS_BY_GAME_KEY)
    .map(([key, regions]) => ({
      key,
      regions,
      name: coverage.find((game) => game.key === key)?.name ?? key,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3">
      {games.map((game) => (
        <div key={game.key} className="flex min-w-0 flex-col gap-2">
          <p className="truncate text-sm font-medium">{game.name}</p>
          <div className="relative mb-3 aspect-[2.5/3.5] w-full rounded-lg border bg-muted">
            <OcrRegionOverlay regions={game.regions} showLabels />
          </div>
          <ul className="flex flex-col gap-1 text-2xs text-foreground/70">
            {game.regions.map((region, i) => (
              <li key={`${region.field}-${i}`} className="flex flex-col">
                <span className="font-medium text-foreground">
                  {tCards(`cardDetailPanel.ocrFields.${region.field}`)}
                  {region.fallback && ` · ${t("ocrRegions.fallback")}`}
                  {region.multiline && ` · ${t("ocrRegions.multiline")}`}
                </span>
                <span className="tabular-nums">
                  {t("ocrRegions.coords", {
                    x: percent(region.x),
                    y: percent(region.y),
                    width: percent(region.width),
                    height: percent(region.height),
                  })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
