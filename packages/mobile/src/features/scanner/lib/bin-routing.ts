import * as Crypto from "expo-crypto";
import {
  areAllChaosBinsFull,
  countCopiesInBin,
  DEFAULT_BIN_CAPACITY,
  evaluateAlphabetBin,
  evaluateCardBin,
  evaluateChaosBin,
  evaluatePickListBin,
  evaluateRepackBin,
  evaluateScanOnlyBin,
  findLowMatchCatchAll,
  getRepackBinCards,
  isRulesMode,
  reservePickListBins,
  resolveOverflowBin,
  type BinConfig,
  type BinSet,
  type PlayingCardWithDistance,
} from "@magic-vault/shared";
import type { RoutingContext, RoutingDecision } from "@/lib/interfaces/scanner";

export function configsFromSet(set: BinSet | undefined, binCount: number): BinConfig[] {
  const filled: BinConfig[] = [];
  for (let i = 1; i <= binCount; i++) {
    const existing = set?.bins.find((c) => c.binNumber === i);
    filled.push(
      existing ?? {
        guid: Crypto.randomUUID(),
        binNumber: i,
        rules: { id: Crypto.randomUUID(), combinator: "and", conditions: [] },
        cardLimit: DEFAULT_BIN_CAPACITY,
      },
    );
  }
  return filled;
}

export function resolveBin(card: PlayingCardWithDistance, ctx: RoutingContext): RoutingDecision {
  const { set, fieldDefinitions } = ctx;
  const rulesMode = isRulesMode(set);
  const configs = rulesMode ? reservePickListBins(ctx.configs) : ctx.configs;
  const isFull = (bin: BinConfig) => ctx.isBinFull(bin.binNumber);
  const lowMatch = findLowMatchCatchAll(card, configs);

  const pick = rulesMode && !lowMatch ? evaluatePickListBin(card.name, ctx.configs) : null;
  if (pick) {
    return { bin: pick.bin, isLowMatch: false, pickListName: pick.entry.name, allChaosBinsFull: false };
  }

  let bin: BinConfig | undefined;
  if (lowMatch) {
    bin = rulesMode ? resolveOverflowBin(lowMatch, configs, isFull) : lowMatch;
  } else if (set?.scanOnly) {
    bin = evaluateScanOnlyBin(configs, set.scanOnlyBin);
  } else if (set?.isChaosMode) {
    bin = evaluateChaosBin(configs, isFull);
  } else if (set?.isAlphabetMode) {
    bin = evaluateAlphabetBin(card, configs, set.alphabetPass, set.alphabetPrefix);
  } else if (set?.isRepackMode) {
    bin = evaluateRepackBin(card, configs, fieldDefinitions, set, (b) =>
      getRepackBinCards(ctx.binContents, b, set, fieldDefinitions),
    );
  } else {
    bin = evaluateCardBin(
      card,
      configs,
      fieldDefinitions,
      ctx.autoAssignActive ? undefined : (b) => countCopiesInBin(ctx.binContents, b, card, fieldDefinitions),
      (b) => ctx.countInBin(b.binNumber),
      isFull,
    );
  }

  return {
    bin,
    isLowMatch: !!lowMatch && bin?.binNumber === lowMatch.binNumber,
    pickListName: null,
    allChaosBinsFull:
      !!set?.isChaosMode && !!bin?.isCatchAll && !lowMatch && areAllChaosBinsFull(configs, isFull),
  };
}
