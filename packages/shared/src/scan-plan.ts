import { buildMatchedScanRecord, resolveScanCard } from "./scan-card";
import { isCardFromOtherGame } from "./match-games";
import {
  isScanFillingLastRepackPack,
  resolveUnmatchedScanBin,
} from "./scan-routing";
import type {
  MatchedScanPlan,
  MatchedScanPlanInput,
  ScanCardPlan,
  ScanCompletionPauseReason,
  ScanPlanContext,
  UnmatchedScanPlan,
  UnmatchedScanPlanInput,
} from "./interfaces/scan-plan.interface";

export function prepareMatchedScanPlan(
  input: MatchedScanPlanInput,
  context: ScanPlanContext,
): MatchedScanPlan {
  const { ruleCard, foilType, stamp, decision } = resolveScanCard(
    input,
    context,
  );
  const record = buildMatchedScanRecord({
    scanId: input.scanId,
    scannedAt: input.scannedAt,
    card: input.card,
    binNumber: decision.bin?.binNumber,
    capturedImageUrl: input.capturedImageUrl,
    capturedBackImageUrl: input.capturedBackImageUrl,
    stamp: stamp ?? undefined,
    alternativeMatches: input.alternativeMatches,
    foilType,
    condition: input.condition,
    lowConfidenceMatch:
      input.lowConfidenceMatch ||
      (decision.action === "route" && decision.isLowMatch),
    vectorizedOn: input.vectorizedOn,
    diagnostics: input.diagnostics,
  });
  const match = decision.action === "route" ? decision.pickListMatch : null;
  const skipSaving =
    context.binSet?.skipSaving === true ||
    isCardFromOtherGame(input.card, input.gameKey);
  return {
    ...decision,
    kind: "matched",
    ruleCard,
    record,
    persistence: skipSaving
      ? {
          kind: "cards/sorted",
          record: {
            scanId: record.scanId,
            card: record.card,
            scannedAt: record.scannedAt,
            hasAlternatives: !!record.alternativeMatches?.length,
            vectorizedOn: record.vectorizedOn,
            deviceGuid: input.deviceGuid,
          },
        }
      : { kind: "cards", record },
    binContent:
      record.binNumber == null
        ? null
        : {
            scanId: record.scanId,
            binNumber: record.binNumber,
            scannedAt: record.scannedAt,
            card: ruleCard,
            isFoil: record.isFoil,
            foilType: record.foilType,
            stamp: record.stamp,
            unsaved: skipSaving,
          },
    pickListUpdate: match
      ? {
          binGuid: match.bin.guid,
          binNumber: match.bin.binNumber,
          name: match.entry.name,
          delta: 1,
        }
      : null,
  };
}

export function prepareUnmatchedScanPlan(
  input: UnmatchedScanPlanInput,
  context: ScanPlanContext,
): UnmatchedScanPlan {
  const decision = resolveUnmatchedScanBin(context);
  const record = {
    scanId: input.scanId,
    scannedAt: input.scannedAt,
    capturedImageUrl: input.capturedImageUrl,
    capturedBackImageUrl: input.capturedBackImageUrl,
    vectorizedOn: input.vectorizedOn,
    binNumber: decision.bin?.binNumber,
    diagnostics: input.diagnostics,
    embedding: input.embedding ?? undefined,
  };
  const skipSaving = context.binSet?.skipSaving === true;
  return {
    ...decision,
    kind: "unmatched",
    record,
    persistence: skipSaving ? { kind: "none" } : { kind: "unmatched", record },
    binContent:
      !skipSaving || record.binNumber == null
        ? null
        : {
            scanId: record.scanId,
            binNumber: record.binNumber,
            scannedAt: record.scannedAt,
            card: {},
            unsaved: true,
            capacityOnly: true,
          },
  };
}

export function scanCompletionPauseReason(
  plan: ScanCardPlan,
  context: ScanPlanContext,
): ScanCompletionPauseReason | null {
  return plan.kind === "matched" &&
    plan.record.binNumber != null &&
    isScanFillingLastRepackPack(plan.record.binNumber, context)
    ? "all-packs-complete"
    : null;
}
