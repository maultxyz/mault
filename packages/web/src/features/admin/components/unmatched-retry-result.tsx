import { Badge } from "@/components/ui/badge";
import { formatMatchDistance } from "@/features/admin/lib/format-match-distance";
import type { UnmatchedRetryResultProps } from "@/lib/interfaces/admin";
import { useTranslation } from "react-i18next";

export function UnmatchedRetryResult({ result }: UnmatchedRetryResultProps) {
  const { t } = useTranslation("admin");

  if (result.status === "match") {
    return (
      <div className="flex min-w-0 flex-col gap-0.5">
        <Badge variant="success" className="w-fit">
          {t("unmatchedRetry.statuses.match")}
        </Badge>
        <p className="truncate text-sm">
          {result.card
            ? t("unmatchedRetry.cardLine", {
                name: result.card.name,
                set: result.card.set.toUpperCase(),
                number: result.card.collectorNumber,
              })
            : t("unmatchedRetry.cardMissing")}
        </p>
        <p className="text-xs text-foreground/70">
          {[
            result.matchedBy === "ocr"
              ? t("unmatchedRetry.matchedByOcr")
              : t("unmatchedRetry.matchedByImage"),
            t("unmatchedRetry.distance", {
              value: formatMatchDistance(result.distance),
            }),
          ].join(" · ")}
        </p>
      </div>
    );
  }

  const nearest = result.candidates[0];
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <Badge variant="outline" className="w-fit">
        {result.reason
          ? t(`unmatchedRetry.reasons.${result.reason}`)
          : t(`unmatchedRetry.statuses.${result.status}`)}
      </Badge>
      {nearest && (
        <p className="truncate text-xs text-foreground/70">
          {t("unmatchedRetry.nearest", {
            name: nearest.name,
            distance: formatMatchDistance(nearest.distance),
          })}
        </p>
      )}
      {result.reason === "ambiguous" && result.runnerUpName && (
        <p className="truncate text-xs text-foreground/70">
          {t("unmatchedRetry.runnerUp", {
            name: result.runnerUpName,
            distance: formatMatchDistance(result.runnerUpDistance),
          })}
        </p>
      )}
      {result.ocr && (
        <p className="truncate text-xs text-foreground/70">
          {t("unmatchedRetry.ocrNoName", {
            text: result.ocr.readout.name || t("unmatchedRetry.ocr.nothingRead"),
          })}
        </p>
      )}
    </div>
  );
}
