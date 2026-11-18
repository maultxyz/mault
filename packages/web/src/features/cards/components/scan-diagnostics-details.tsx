import { DetailSection } from "@/features/cards/components/detail-section";
import type {
  ScanDiagnosticsProps,
  TechnicalDetailRowProps,
} from "@/lib/interfaces/cards";
import { useTranslation } from "react-i18next";

export function formatDiagnosticNumber(
  value: number | null | undefined,
  digits = 3,
): string {
  return value == null ? "n/a" : value.toFixed(digits);
}

export function TechnicalDetailRow({ label, children }: TechnicalDetailRowProps) {
  return (
    <>
      <dt className="text-foreground/70">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </>
  );
}

export function ScanDiagnosticRows({ diagnostics }: ScanDiagnosticsProps) {
  const { t } = useTranslation("cards");
  return (
    <>
      <TechnicalDetailRow label={t("technicalDetails.vectorizedOn")}>
        {diagnostics.vectorizedOn}
      </TechnicalDetailRow>
      <TechnicalDetailRow label={t("technicalDetails.orientation")}>
        {t(`technicalDetails.orientationValue.${diagnostics.orientation}`)}
      </TechnicalDetailRow>
      {diagnostics.printingMarks && (
        <TechnicalDetailRow label={t("technicalDetails.printingMarks")}>
          {diagnostics.printingMarks.skipped
            ? t(
                `technicalDetails.printingMarksSkipped.${diagnostics.printingMarks.skipped}`,
              )
            : t(
                diagnostics.printingMarks.cardId
                  ? "technicalDetails.printingMarksChanged"
                  : "technicalDetails.printingMarksKept",
                {
                  evidence: diagnostics.printingMarks.evidence.toFixed(2),
                },
              )}
        </TechnicalDetailRow>
      )}
      {diagnostics.printingMarks?.languageCode && (
        <TechnicalDetailRow label={t("technicalDetails.printedLanguageCode")}>
          {t(
            `technicalDetails.printedLanguageCodeValue.${diagnostics.printingMarks.languageCode.detected ? "present" : "absent"}${diagnostics.printingMarks.languageCode.cardId ? "Changed" : "Kept"}`,
          )}
        </TechnicalDetailRow>
      )}
      {diagnostics.printedFoilMarker && (
        <TechnicalDetailRow label={t("technicalDetails.printedFoilMarker")}>
          {t(
            `technicalDetails.printedFoilMarkerValue.${diagnostics.printedFoilMarker.marker ?? "none"}`,
          )}
        </TechnicalDetailRow>
      )}
      {diagnostics.stampDetection && (
        <TechnicalDetailRow label={t("technicalDetails.stampDetection")}>
          {diagnostics.stampDetection.isStampDetected
            ? diagnostics.stampDetection.stamp
            : t("technicalDetails.noStampDetected")}
        </TechnicalDetailRow>
      )}
      {typeof diagnostics.foilDetection?.foilScore === "number" && (
        <TechnicalDetailRow label={t("technicalDetails.foilDetection")}>
          {t(
            diagnostics.foilDetection.isFoilDetected
              ? "technicalDetails.foilDetected"
              : "technicalDetails.foilNotDetected",
            {
              method: t(
                `technicalDetails.foilMethod.${diagnostics.foilDetection.method ?? "rainbow"}`,
              ),
              score: diagnostics.foilDetection.foilScore.toFixed(2),
            },
          )}
        </TechnicalDetailRow>
      )}
    </>
  );
}

export function ScanDiagnosticsSections({ diagnostics }: ScanDiagnosticsProps) {
  const { t } = useTranslation("cards");
  return (
    <>
      {diagnostics.candidates.length > 0 && (
        <DetailSection title={t("technicalDetails.candidates")}>
          <ul className="flex flex-col gap-1 text-sm">
            {diagnostics.candidates.map((candidate) => (
              <li key={candidate.cardId} className="flex justify-between gap-4">
                <span className="min-w-0 truncate">
                  {candidate.name ?? candidate.cardId}
                </span>
                <span className="shrink-0 tabular-nums text-foreground/70">
                  {t("technicalDetails.candidateScore", {
                    distance: formatDiagnosticNumber(candidate.distance),
                    confidence: formatDiagnosticNumber(candidate.confidence),
                  })}
                </span>
              </li>
            ))}
          </ul>
        </DetailSection>
      )}

      <DetailSection
        title={t("technicalDetails.attempts", {
          needed: diagnostics.matchesNeeded,
        })}
      >
        <ol className="flex list-inside list-decimal flex-col gap-1 text-sm">
          {diagnostics.attempts.map((attempt, index) => (
            <li key={index}>
              {attempt.cardName ?? t("technicalDetails.attemptNoMatch")}{" "}
              <span className="tabular-nums text-foreground/70">
                ({formatDiagnosticNumber(attempt.distance)})
              </span>
            </li>
          ))}
        </ol>
      </DetailSection>

      <DetailSection title={t("technicalDetails.detection")}>
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-1.5 text-sm">
          <TechnicalDetailRow label={t("technicalDetails.cornerDetection")}>
            {diagnostics.detection.fallbackReason
              ? t("technicalDetails.cornerDetectionFallback")
              : t("technicalDetails.cornerDetectionFound")}
          </TechnicalDetailRow>
          <TechnicalDetailRow label={t("technicalDetails.sharpness")}>
            {formatDiagnosticNumber(diagnostics.detection.sharpness)}
          </TechnicalDetailRow>
          <TechnicalDetailRow label={t("technicalDetails.detectionConfidence")}>
            {formatDiagnosticNumber(diagnostics.detection.confidence)}
          </TechnicalDetailRow>
          {diagnostics.detection.fallbackReason && (
            <TechnicalDetailRow label={t("technicalDetails.fallbackReason")}>
              {diagnostics.detection.fallbackReason}
            </TechnicalDetailRow>
          )}
        </dl>
      </DetailSection>

      <DetailSection title={t("technicalDetails.ocr")}>
        {diagnostics.ocr ? (
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-1.5 text-sm">
            <TechnicalDetailRow label={t("technicalDetails.ocrName")}>
              <span className="whitespace-pre-line font-mono">
                {diagnostics.ocr.readout.name || "n/a"}
              </span>
            </TechnicalDetailRow>
            <TechnicalDetailRow label={t("technicalDetails.ocrSetLine")}>
              <span className="whitespace-pre-line font-mono">
                {diagnostics.ocr.readout.setLine || "n/a"}
              </span>
            </TechnicalDetailRow>
            <TechnicalDetailRow label={t("technicalDetails.ocrNumber")}>
              <span className="whitespace-pre-line font-mono">
                {diagnostics.ocr.readout.number || "n/a"}
              </span>
            </TechnicalDetailRow>
            <TechnicalDetailRow label={t("technicalDetails.ocrMatchedName")}>
              {diagnostics.ocr.matchedName
                ? `${diagnostics.ocr.matchedName} (${formatDiagnosticNumber(diagnostics.ocr.nameScore, 2)})`
                : "n/a"}
            </TechnicalDetailRow>
            <TechnicalDetailRow label={t("technicalDetails.ocrUsedFallback")}>
              {diagnostics.ocr.usedFallback
                ? t("technicalDetails.ocrUsedFallbackYes")
                : t("technicalDetails.ocrUsedFallbackNo")}
            </TechnicalDetailRow>
          </dl>
        ) : (
          <p className="text-sm text-foreground/70">
            {t("technicalDetails.ocrNotRun")}
          </p>
        )}
      </DetailSection>
    </>
  );
}
