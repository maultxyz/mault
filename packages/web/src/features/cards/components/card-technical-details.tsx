import { Button } from "@/components/ui/button";
import { DetailSection } from "@/features/cards/components/detail-section";
import { loadCardDiagnostics } from "@/features/collections/api/collections";
import { useCardDetailCollection } from "@/features/cards/api/use-card-detail-scope";
import type {
  CardTechnicalDetailsProps,
  TechnicalDetailRowProps,
} from "@/lib/interfaces/cards";
import { toast } from "@/lib/toast";
import { matchPercent } from "@/lib/utils";
import { IconCopy } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

function formatNumber(value: number | null | undefined, digits = 3): string {
  return value == null ? "n/a" : value.toFixed(digits);
}

function Row({ label, children }: TechnicalDetailRowProps) {
  return (
    <>
      <dt className="text-foreground/70">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </>
  );
}

export function CardTechnicalDetails({
  scanId,
  card,
  needsReview = false,
  wasCorrected = false,
}: CardTechnicalDetailsProps) {
  const { t } = useTranslation("cards");
  const collection = useCardDetailCollection();
  const guid = collection?.guid;

  const { data: diagnostics, isLoading } = useQuery({
    queryKey: ["collection-card-diagnostics", guid, scanId],
    queryFn: () =>
      loadCardDiagnostics(guid!, scanId).then((r) => r.data ?? null),
    enabled: !!guid,
    staleTime: Infinity,
  });

  const cardJson = JSON.stringify(card, null, 2);
  const yesNo = (value: boolean) =>
    value ? t("technicalDetails.yes") : t("technicalDetails.no");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(cardJson);
      toast.success(t("technicalDetails.copied"));
    } catch {
      toast.error(t("technicalDetails.copyFailed"));
    }
  };

  return (
    <div className="flex flex-col gap-6 rounded-lg border bg-muted p-4">
      <DetailSection title={t("technicalDetails.match")}>
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-1.5 text-sm">
          <Row label={t("technicalDetails.matchedBy")}>
            {diagnostics
              ? t(`technicalDetails.matchedByValue.${diagnostics.matchedBy}`)
              : "n/a"}
          </Row>
          <Row label={t("technicalDetails.matchPercent")}>
            {card.distance != null
              ? `${matchPercent(card).toFixed(2)}%`
              : "n/a"}
          </Row>
          <Row label={t("technicalDetails.distance")}>
            {formatNumber(card.distance)}
          </Row>
          <Row label={t("technicalDetails.confidence")}>
            {formatNumber(card.confidence)}
          </Row>
          <Row label={t("technicalDetails.needsReview")}>
            {yesNo(needsReview)}
          </Row>
          <Row label={t("technicalDetails.reviewed")}>
            {yesNo(wasCorrected)}
          </Row>
          {diagnostics && (
            <>
              <Row label={t("technicalDetails.vectorizedOn")}>
                {diagnostics.vectorizedOn}
              </Row>
              <Row label={t("technicalDetails.orientation")}>
                {t(`technicalDetails.orientationValue.${diagnostics.orientation}`)}
              </Row>
              {diagnostics.detectedColor !== undefined && (
                <Row label={t("technicalDetails.detectedColor")}>
                  {diagnostics.detectedColor ?? t("technicalDetails.noColor")}
                </Row>
              )}
            </>
          )}
        </dl>
      </DetailSection>

      {isLoading ? null : !diagnostics ? (
        <p className="text-sm text-foreground/70">
          {t("technicalDetails.noDiagnostics")}
        </p>
      ) : (
        <>
          {diagnostics.candidates.length > 0 && (
            <DetailSection title={t("technicalDetails.candidates")}>
              <ul className="flex flex-col gap-1 text-sm">
                {diagnostics.candidates.map((candidate) => (
                  <li
                    key={candidate.cardId}
                    className="flex justify-between gap-4"
                  >
                    <span className="min-w-0 truncate">
                      {candidate.name ?? candidate.cardId}
                    </span>
                    <span className="shrink-0 tabular-nums text-foreground/70">
                      {t("technicalDetails.candidateScore", {
                        distance: formatNumber(candidate.distance),
                        confidence: formatNumber(candidate.confidence),
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
                    ({formatNumber(attempt.distance)})
                  </span>
                </li>
              ))}
            </ol>
          </DetailSection>

          <DetailSection title={t("technicalDetails.detection")}>
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-1.5 text-sm">
              <Row label={t("technicalDetails.cornerDetection")}>
                {diagnostics.detection.fallbackReason
                  ? t("technicalDetails.cornerDetectionFallback")
                  : t("technicalDetails.cornerDetectionFound")}
              </Row>
              <Row label={t("technicalDetails.sharpness")}>
                {formatNumber(diagnostics.detection.sharpness)}
              </Row>
              <Row label={t("technicalDetails.detectionConfidence")}>
                {formatNumber(diagnostics.detection.confidence)}
              </Row>
              {diagnostics.detection.fallbackReason && (
                <Row label={t("technicalDetails.fallbackReason")}>
                  {diagnostics.detection.fallbackReason}
                </Row>
              )}
            </dl>
          </DetailSection>

          <DetailSection title={t("technicalDetails.ocr")}>
            {diagnostics.ocr ? (
              <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-1.5 text-sm">
                <Row label={t("technicalDetails.ocrName")}>
                  <span className="whitespace-pre-line font-mono">
                    {diagnostics.ocr.readout.name || "n/a"}
                  </span>
                </Row>
                <Row label={t("technicalDetails.ocrSetLine")}>
                  <span className="whitespace-pre-line font-mono">
                    {diagnostics.ocr.readout.setLine || "n/a"}
                  </span>
                </Row>
                <Row label={t("technicalDetails.ocrNumber")}>
                  <span className="whitespace-pre-line font-mono">
                    {diagnostics.ocr.readout.number || "n/a"}
                  </span>
                </Row>
                <Row label={t("technicalDetails.ocrMatchedName")}>
                  {diagnostics.ocr.matchedName
                    ? `${diagnostics.ocr.matchedName} (${formatNumber(diagnostics.ocr.nameScore, 2)})`
                    : "n/a"}
                </Row>
              </dl>
            ) : (
              <p className="text-sm text-foreground/70">
                {t("technicalDetails.ocrNotRun")}
              </p>
            )}
          </DetailSection>
        </>
      )}

      <DetailSection title={t("technicalDetails.cardJson")}>
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={handleCopy}>
            <IconCopy />
            {t("technicalDetails.copyJson")}
          </Button>
        </div>
        <pre className="max-h-96 overflow-auto rounded-md border bg-background p-3 font-mono text-xs">
          {cardJson}
        </pre>
      </DetailSection>
    </div>
  );
}
