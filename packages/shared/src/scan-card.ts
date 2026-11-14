import { resolveScanFoilType } from "./foil-detection";
import { toRuleCard } from "./scan-rule-fields";
import { resolveScanBin } from "./scan-routing";
import { detectedStampOf } from "./card-stamps";
import type { MatchedScanPlanInput } from "./interfaces/scan-plan.interface";
import type { ScanRoutingContext } from "./interfaces/scan-routing.interface";

export function resolveScanCard(
  input: MatchedScanPlanInput,
  routingContext: ScanRoutingContext,
) {
  const { card } = input;
  const foilType = resolveScanFoilType({
    card,
    sessionFoilType: input.sessionFoilType,
    foilDetection: input.foilDetection,
    fallbackFoilTypes: input.fallbackFoilTypes,
    gameKey: card.gameKey ?? input.gameKey,
    printedFoilMarker: input.diagnostics?.printedFoilMarker,
    isNudgeFoilDetectionEnabled: input.isNudgeFoilDetectionEnabled ?? false,
    isFoilStarDetectionEnabled: input.isFoilStarDetectionEnabled ?? false,
  });
  const stamp = detectedStampOf(input.diagnostics?.stampDetection);
  const ruleCard = toRuleCard(card, {
    isFoil: foilType != null,
    foilType,
    stamp,
  });
  return {
    foilType,
    stamp,
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
