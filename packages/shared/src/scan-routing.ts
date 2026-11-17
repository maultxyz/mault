import {
  areAllChaosBinsFull,
  areAllRepackPacksComplete,
  countCopiesInBin,
  evaluateAlphabetBin,
  evaluateCardBin,
  evaluateChaosBin,
  evaluateRepackBin,
  evaluateScanOnlyBin,
  findAutoAssignTarget,
  findLowMatchCatchAll,
  getRepackBinCards,
  getRepackPackBins,
  isRulesMode,
  resolveOverflowBin,
} from "./evaluate-bin";
import { evaluatePickListBin, reservePickListBins } from "./pick-list";
import type {
  AutoAssignTarget,
  ScanRoutingCard,
  ScanRoutingContext,
  ScanRoutingDecision,
} from "./interfaces/scan-routing.interface";
import type { SourceCard } from "./interfaces/card.interface";
import type { BinConfig, BinSet } from "./interfaces/sort-bins.interface";

function routableConfigs(context: ScanRoutingContext): BinConfig[] {
  return isRulesMode(context.binSet ?? undefined)
    ? reservePickListBins(context.configs)
    : context.configs;
}

function repackCardsInBin(context: ScanRoutingContext, repackSet: BinSet) {
  return (bin: BinConfig): SourceCard[] =>
    getRepackBinCards(
      context.binContents,
      bin,
      repackSet,
      context.fieldDefinitions,
    );
}

export function applyAutoAssignTarget(
  configs: BinConfig[],
  target: AutoAssignTarget,
): BinConfig[] {
  return configs.map((config) =>
    config.binNumber === target.binNumber
      ? { ...config, rules: target.rules }
      : config,
  );
}

export function matchScanBin(
  card: ScanRoutingCard,
  context: ScanRoutingContext,
): BinConfig | undefined {
  const { binSet, fieldDefinitions } = context;
  const configs = routableConfigs(context);
  const isBinConfigFull = (bin: BinConfig) => context.isBinFull(bin.binNumber);
  const lowMatchBin = findLowMatchCatchAll(card, configs);
  if (lowMatchBin) {
    return isRulesMode(binSet ?? undefined)
      ? resolveOverflowBin(lowMatchBin, configs, isBinConfigFull)
      : lowMatchBin;
  }
  if (binSet?.scanOnly) return evaluateScanOnlyBin(configs, binSet.scanOnlyBin);
  if (binSet?.isChaosMode) return evaluateChaosBin(configs, isBinConfigFull);
  if (binSet?.isAlphabetMode) {
    return evaluateAlphabetBin(
      card,
      configs,
      binSet.alphabetPass,
      binSet.alphabetPrefix,
    );
  }
  if (binSet?.isRepackMode) {
    return evaluateRepackBin(
      card,
      configs,
      fieldDefinitions,
      binSet,
      repackCardsInBin(context, binSet),
      (bin) => context.binRoom(bin.binNumber),
    );
  }
  return evaluateCardBin(
    card,
    configs,
    fieldDefinitions,
    binSet?.autoAssignField
      ? undefined
      : (bin) =>
          countCopiesInBin(context.binContents, bin, card, fieldDefinitions),
    (bin) => context.countCardsInBin(bin.binNumber),
    isBinConfigFull,
  );
}

export function areAllScanRepackPacksComplete(
  context: ScanRoutingContext,
): boolean {
  const { binSet } = context;
  return (
    !!binSet?.isRepackMode &&
    areAllRepackPacksComplete(
      routableConfigs(context),
      context.fieldDefinitions,
      binSet,
      repackCardsInBin(context, binSet),
      (bin) => context.binRoom(bin.binNumber),
    )
  );
}

export function isScanFillingLastRepackPack(
  binNumber: number,
  context: ScanRoutingContext,
): boolean {
  const { binSet } = context;
  return (
    !!binSet?.isRepackMode &&
    getRepackPackBins(routableConfigs(context), binSet).some(
      (bin) => bin.binNumber === binNumber,
    ) &&
    areAllScanRepackPacksComplete(context)
  );
}

export function resolveScanBin(
  card: ScanRoutingCard,
  context: ScanRoutingContext,
): ScanRoutingDecision {
  const { binSet } = context;
  const configs = routableConfigs(context);
  const lowMatchBin = findLowMatchCatchAll(card, configs);
  const pickListMatch =
    isRulesMode(binSet ?? undefined) && !lowMatchBin
      ? evaluatePickListBin(card.name, context.configs)
      : null;
  const autoAssignTarget =
    pickListMatch || binSet?.isRepackMode
      ? null
      : findAutoAssignTarget(
          card,
          configs,
          context.fieldDefinitions,
          binSet?.autoAssignField ?? null,
          context.createRuleId,
        );
  const bin =
    pickListMatch?.bin ??
    (autoAssignTarget
      ? applyAutoAssignTarget(configs, autoAssignTarget).find(
          (config) => config.binNumber === autoAssignTarget.binNumber,
        )
      : matchScanBin(card, context));

  const routesToCatchAllNormally = !!bin?.isCatchAll && !lowMatchBin;
  if (
    routesToCatchAllNormally &&
    binSet?.isChaosMode &&
    areAllChaosBinsFull(configs, (config) => context.isBinFull(config.binNumber))
  ) {
    return { action: "pause", reason: "all-chaos-bins-full", bin };
  }
  if (routesToCatchAllNormally && areAllScanRepackPacksComplete(context)) {
    return { action: "pause", reason: "all-packs-complete", bin };
  }
  if (bin && context.isBinFull(bin.binNumber)) {
    return { action: "pause", reason: "bin-full", bin };
  }
  return {
    action: "route",
    bin,
    isLowMatch: !!bin && lowMatchBin?.binNumber === bin.binNumber,
    pickListMatch,
    autoAssignTarget,
  };
}
