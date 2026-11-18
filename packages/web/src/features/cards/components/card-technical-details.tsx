import { Button } from "@/components/ui/button";
import { DetailSection } from "@/features/cards/components/detail-section";
import { cardDiagnosticsQueryOptions } from "@/features/collections/api/collections";
import { useCardDetailCollection } from "@/features/cards/api/use-card-detail-scope";
import {
  ScanDiagnosticRows,
  ScanDiagnosticsSections,
  TechnicalDetailRow as Row,
  formatDiagnosticNumber as formatNumber,
} from "@/features/cards/components/scan-diagnostics-details";
import type { CardTechnicalDetailsProps } from "@/lib/interfaces/cards";
import { matchPercent } from "@/lib/utils";
import { IconCopy } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { copyWithToast } from "@/lib/clipboard";

export function CardTechnicalDetails({
  scanId,
  card,
  lowConfidenceMatch = false,
  wasCorrected = false,
  isReviewed = false,
}: CardTechnicalDetailsProps) {
  const { t } = useTranslation("cards");
  const collection = useCardDetailCollection();
  const guid = collection?.guid;

  const { data: diagnostics, isLoading } = useQuery(
    cardDiagnosticsQueryOptions(guid, scanId),
  );

  const cardJson = JSON.stringify(card, null, 2);
  const yesNo = (value: boolean) =>
    value ? t("technicalDetails.yes") : t("technicalDetails.no");

  const handleCopy = async () => {
    await copyWithToast(
      cardJson,
      t("technicalDetails.copied"),
      t("technicalDetails.copyFailed"),
    );
  };

  return (
    <div className="flex flex-col gap-6 md:gap-2 rounded-lg bg-foreground/6 p-4">
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
          <Row label={t("technicalDetails.lowConfidenceMatch")}>
            {yesNo(lowConfidenceMatch)}
          </Row>
          <Row label={t("technicalDetails.reviewed")}>
            {yesNo(isReviewed || wasCorrected)}
          </Row>
          <Row label={t("technicalDetails.corrected")}>
            {yesNo(wasCorrected)}
          </Row>
          {diagnostics && <ScanDiagnosticRows diagnostics={diagnostics} />}
        </dl>
      </DetailSection>

      {isLoading ? null : !diagnostics ? (
        <p className="text-sm text-foreground/70">
          {t("technicalDetails.noDiagnostics")}
        </p>
      ) : (
        <ScanDiagnosticsSections diagnostics={diagnostics} />
      )}

      <DetailSection title={t("technicalDetails.cardJson")}>
        <div className="flex justify-end">
          <Button variant="outline" onClick={handleCopy}>
            <IconCopy />
            {t("technicalDetails.copyJson")}
          </Button>
        </div>
        <pre className="max-h-96 overflow-auto rounded-lg bg-card p-3 font-mono text-xs">
          {cardJson}
        </pre>
      </DetailSection>
    </div>
  );
}
