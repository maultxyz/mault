import type { UnmatchedDiagnosticsDetailsProps } from "@/lib/interfaces/scanner";
import { useTranslation } from "react-i18next";

function formatDistance(distance: number | null): string {
  return distance == null ? "n/a" : distance.toFixed(3);
}

export function UnmatchedDiagnosticsDetails({
  diagnostics,
}: UnmatchedDiagnosticsDetailsProps) {
  const { t } = useTranslation("scanner");
  const { search, detection, attempts } = diagnostics;

  return (
    <div className="w-64 flex flex-col gap-2 px-1.5 py-1 text-xs">
      <div>
        <p className="font-medium">
          {t(`unmatchedCardsPanel.reasons.${diagnostics.reason}`)}
        </p>
        <p className="text-foreground/70">
          {t(`unmatchedCardsPanel.reasonHints.${diagnostics.reason}`)}
        </p>
      </div>

      {search && search.candidates.length > 0 && (
        <div>
          <p className="font-medium">
            {t("unmatchedCardsPanel.candidates", {
              threshold: formatDistance(search.distanceThreshold),
            })}
          </p>
          <ul className="text-foreground/70">
            {search.candidates.slice(0, 3).map((candidate) => (
              <li key={candidate.cardId} className="flex justify-between gap-2">
                <span className="truncate">
                  {candidate.name} ({candidate.setCode.toUpperCase()})
                </span>
                <span className="tabular-nums">
                  {formatDistance(candidate.distance)}
                </span>
              </li>
            ))}
          </ul>
          {diagnostics.reason === "ambiguous" && search.runnerUpName && (
            <p className="text-foreground/70">
              {t("unmatchedCardsPanel.runnerUp", {
                name: search.runnerUpName,
                distance: formatDistance(search.runnerUpDistance),
              })}
            </p>
          )}
        </div>
      )}

      {attempts.length > 1 && (
        <div>
          <p className="font-medium">
            {t("unmatchedCardsPanel.attempts", {
              needed: diagnostics.matchesNeeded,
            })}
          </p>
          <ol className="text-foreground/70 list-decimal list-inside">
            {attempts.map((attempt, index) => (
              <li key={index}>
                {attempt.cardName ??
                  t(
                    `unmatchedCardsPanel.reasons.${attempt.reason ?? "too_far"}`,
                  )}{" "}
                <span className="tabular-nums">
                  ({formatDistance(attempt.distance)})
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {diagnostics.lookupFailedCardIds &&
        diagnostics.lookupFailedCardIds.length > 0 && (
          <p className="text-foreground/70 break-all">
            {t("unmatchedCardsPanel.lookupFailedIds", {
              ids: diagnostics.lookupFailedCardIds.join(", "),
            })}
          </p>
        )}

      {diagnostics.ocr && (
        <div>
          <p className="font-medium">{t("unmatchedCardsPanel.ocrHeading")}</p>
          <p className="text-foreground/70 break-all">
            {t("unmatchedCardsPanel.ocrName", {
              text:
                diagnostics.ocr.readout.name ||
                t("unmatchedCardsPanel.ocrEmpty"),
            })}
          </p>
          <p className="text-foreground/70 break-all">
            {t("unmatchedCardsPanel.ocrSetLine", {
              text:
                diagnostics.ocr.readout.setLine ||
                t("unmatchedCardsPanel.ocrEmpty"),
            })}
          </p>
          <p className="text-foreground/70">
            {diagnostics.ocr.matchedName
              ? t("unmatchedCardsPanel.ocrMatchedName", {
                  name: diagnostics.ocr.matchedName,
                  score: (diagnostics.ocr.nameScore ?? 0).toFixed(2),
                })
              : t("unmatchedCardsPanel.ocrNoName")}
          </p>
        </div>
      )}

      <div className="text-foreground/70">
        <p>
          {detection.fallbackReason
            ? t("unmatchedCardsPanel.detectionFallback")
            : t("unmatchedCardsPanel.detectionAi")}
          {detection.sharpness != null &&
            ` ${t("unmatchedCardsPanel.sharpness", {
              value: detection.sharpness.toFixed(3),
            })}`}
        </p>
        {detection.fallbackReason && (
          <p className="break-all">{detection.fallbackReason}</p>
        )}
        {diagnostics.orientation === "rotated" && (
          <p>{t("unmatchedCardsPanel.orientationRotated")}</p>
        )}
        {search && (
          <p>
            {t("unmatchedCardsPanel.searchedIn", {
              game: search.gameKey,
              lang: search.lang,
            })}
          </p>
        )}
      </div>
    </div>
  );
}
