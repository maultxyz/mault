import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getSampleCard } from "@/features/cards/api/card-search";
import { OcrRegionOverlay } from "@/features/cards/components/ocr-region-overlay";
import { gameCoverageQueryOptions } from "@/features/games/api/games";
import type { OcrRegionTileProps } from "@/lib/interfaces/health";
import { OCR_REGIONS_BY_GAME_KEY } from "@magic-vault/shared";
import { IconArrowsShuffle } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";

function percent(value: number) {
  return Math.round(value * 1000) / 10;
}

function OcrRegionTile({ gameKey, name, lang, regions }: OcrRegionTileProps) {
  const { t } = useTranslation("health");
  const { t: tCards } = useTranslation("cards");
  const [sampleIndex, setSampleIndex] = useState(0);
  const sample = useQuery({
    queryKey: ["ocr-sample-card", gameKey, lang, sampleIndex],
    queryFn: () =>
      getSampleCard(gameKey, lang!, sampleIndex).then((r) => r.data ?? null),
    enabled: !!lang,
    staleTime: Infinity,
  });
  const card = sample.data;
  const imageUrl = card?.image?.normal ?? card?.image?.small;

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-sm font-medium">{name}</p>
        {lang && (
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={t("ocrRegions.anotherCard")}
            title={t("ocrRegions.anotherCard")}
            disabled={sample.isFetching}
            onClick={() => setSampleIndex((i) => i + 1)}
          >
            <IconArrowsShuffle />
          </Button>
        )}
      </div>
      <div className="relative mb-3 aspect-[2.5/3.5] w-full rounded-lg border bg-muted">
        {sample.isLoading && (
          <Skeleton className="absolute inset-0 rounded-lg" />
        )}
        {imageUrl && (
          <img
            src={imageUrl}
            alt={card?.name ?? ""}
            loading="lazy"
            className="absolute inset-0 h-full w-full rounded-lg object-fill"
          />
        )}
        <OcrRegionOverlay regions={regions} showLabels />
      </div>
      {card && (
        <p className="truncate text-2xs text-foreground/70">
          {t("ocrRegions.sample", {
            name: card.name,
            set: card.set.toUpperCase(),
            number: card.collectorNumber,
          })}
        </p>
      )}
      <ul className="flex flex-col gap-1 text-2xs text-foreground/70">
        {regions.map((region, i) => (
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
  );
}

export function OcrRegionGallery() {
  const { data: coverage = [] } = useQuery(gameCoverageQueryOptions);

  const games = Object.entries(OCR_REGIONS_BY_GAME_KEY)
    .map(([key, regions]) => {
      const game = coverage.find((g) => g.key === key);
      return {
        key,
        regions,
        name: game?.name ?? key,
        lang: game && game.cardCount > 0 ? (game.languages[0] ?? "en") : null,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3">
      {games.map((game) => (
        <OcrRegionTile
          key={game.key}
          gameKey={game.key}
          name={game.name}
          lang={game.lang}
          regions={game.regions}
        />
      ))}
    </div>
  );
}
