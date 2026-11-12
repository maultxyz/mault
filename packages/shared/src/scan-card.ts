import { resolveScanFoilType } from "./foil-detection";
import { toRuleCard } from "./scan-rule-fields";
import { resolveScanBin } from "./scan-routing";
import type { PlayingCardWithDistance } from "./interfaces/card.interface";
import type { FoilDetection } from "./interfaces/foil-detection.interface";
import type { ScanRoutingContext } from "./interfaces/scan-routing.interface";

export function resolveScanCard(
  card: PlayingCardWithDistance,
  sessionFoilType: string | null,
  foilDetection: FoilDetection | null | undefined,
  fallbackFoilTypes: string[],
  routingContext: ScanRoutingContext,
) {
  const foilType = resolveScanFoilType(
    card,
    sessionFoilType,
    foilDetection,
    fallbackFoilTypes,
  );
  const ruleCard = toRuleCard(card, { isFoil: foilType != null, foilType });
  return {
    foilType,
    ruleCard,
    decision: resolveScanBin(ruleCard, routingContext),
  };
}

export function buildMatchedScanRecord(
  input: import("./interfaces/scan-workflow.interface").MatchedScanRecordInput,
): import("./interfaces/scanner.interface").ScannedCard {
  return {
    ...input,
    alternativeMatches: input.alternativeMatches?.length
      ? input.alternativeMatches
      : undefined,
    isFoil: input.foilType != null || undefined,
    foilType: input.foilType ?? undefined,
    lowConfidenceMatch: input.lowConfidenceMatch || undefined,
  };
}
