import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMatchDistance } from "@/features/admin/lib/format-match-distance";
import type { UnmatchedOcrPanelProps } from "@/lib/interfaces/admin";
import { IconLoader2, IconTextScan2 } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function UnmatchedOcrPanel({
  result,
  isRunning,
  canRun,
  onRun,
}: UnmatchedOcrPanelProps) {
  const { t } = useTranslation("admin");

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium">{t("unmatchedRetry.ocr.heading")}</h3>
        <Button
          variant="outline"
          onClick={onRun}
          disabled={isRunning || !canRun}
        >
          {isRunning ? (
            <IconLoader2 className="animate-spin" />
          ) : (
            <IconTextScan2 />
          )}
          {t("unmatchedRetry.ocr.run")}
        </Button>
      </div>

      {!result ? (
        <p className="text-xs text-foreground/70">
          {t("unmatchedRetry.ocr.hint")}
        </p>
      ) : !result.supported ? (
        <p className="text-xs text-foreground/70">
          {t("unmatchedRetry.ocr.unsupported")}
        </p>
      ) : (
        <>
          <ul className="flex flex-col gap-2">
            {result.regions.map((region, index) => (
              <li
                key={`${region.field}-${index}`}
                className="flex flex-col gap-1.5 rounded-md border p-2"
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="text-xs font-medium">
                    {t(`unmatchedRetry.ocr.fields.${region.field}`)}
                  </p>
                  <Badge variant={region.anchored ? "success" : "outline"}>
                    {region.anchored
                      ? t("unmatchedRetry.ocr.anchored")
                      : t("unmatchedRetry.ocr.defaultPosition")}
                  </Badge>
                  {region.fallback && (
                    <Badge variant="outline">
                      {t("unmatchedRetry.ocr.fallbackRegion")}
                    </Badge>
                  )}
                </div>
                {region.anchorText && (
                  <p className="truncate text-xs text-foreground/70">
                    {t("unmatchedRetry.ocr.anchoredTo", {
                      text: region.anchorText,
                    })}
                  </p>
                )}
                <img
                  src={region.imageDataUrl}
                  alt={t(`unmatchedRetry.ocr.fields.${region.field}`)}
                  className="max-h-20 w-full rounded-sm border bg-white object-contain"
                />
                <p className="whitespace-pre-wrap break-words font-mono text-xs">
                  {region.text || t("unmatchedRetry.ocr.nothingRead")}
                </p>
              </li>
            ))}
          </ul>

          {result.ocr && (
            <div className="flex flex-col gap-0.5 text-xs">
              <p>
                {result.ocr.matchedName
                  ? t("unmatchedRetry.ocr.closestName", {
                      name: result.ocr.matchedName,
                      score: (result.ocr.nameScore ?? 0).toFixed(2),
                    })
                  : t("unmatchedRetry.ocr.noName")}
              </p>
              {result.ocr.usedFallback && (
                <p className="text-foreground/70">
                  {t("unmatchedRetry.ocr.usedFallback")}
                </p>
              )}
            </div>
          )}

          <div className="flex flex-col gap-0.5">
            <Badge
              variant={result.card ? "success" : "outline"}
              className="w-fit"
            >
              {result.card
                ? t("unmatchedRetry.statuses.match")
                : t("unmatchedRetry.ocr.noMatch")}
            </Badge>
            {result.card && (
              <p className="truncate text-sm">
                {t("unmatchedRetry.cardLine", {
                  name: result.card.name,
                  set: result.card.set.toUpperCase(),
                  number: result.card.collectorNumber,
                })}
                <span className="text-xs text-foreground/70">
                  {" "}
                  {t("unmatchedRetry.distance", {
                    value: formatMatchDistance(result.distance),
                  })}
                </span>
              </p>
            )}
          </div>
        </>
      )}
    </section>
  );
}
