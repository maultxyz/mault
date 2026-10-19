import type { BinConfig, BinSet } from "@magic-vault/shared";
import {
  saveBinConfig,
  setAlphabetConfig,
  setAutoAssignField,
  setChaosMode,
  setRepackConfig,
  setScanOnly,
  setSkipSaving,
} from "@/features/rules/api/bin-sets";
import { emptyRules } from "@/features/rules/lib/rules";
import type { ModeFormValues } from "@/lib/interfaces/forms";
import type { BinSetMode } from "@/lib/interfaces/rules";

function chaosSize(values: ModeFormValues): number | null {
  return values.chaosBinSize === "" ? null : Number(values.chaosBinSize);
}

async function turnOff(set: BinSet, mode: BinSetMode): Promise<BinSet[] | null> {
  switch (mode) {
    case "auto-assign":
      return setAutoAssignField(set.guid, null);
    case "scan-only":
      return setScanOnly(set.guid, { enabled: false });
    case "repack":
      return setRepackConfig(set.guid, {
        isRepackMode: false,
        repackSlots: set.repackSlots,
        repackUniqueBy: set.repackUniqueBy,
        repackSiftRules: set.repackSiftRules,
      });
    case "alphabet":
      return setAlphabetConfig(set.guid, { isAlphabetMode: false, pass: 0, prefix: "" });
    case "chaos":
      return setChaosMode(set.guid, { isChaosMode: false, chaosBinSize: set.chaosBinSize });
    default:
      return null;
  }
}

async function saveCatchAll(bin: BinConfig, gameGuid: string | undefined): Promise<void> {
  await saveBinConfig({
    binNumber: bin.binNumber,
    gameGuid,
    rules: emptyRules(),
    isCatchAll: true,
    isDisabled: false,
    cardLimit: bin.cardLimit ?? null,
    overflowBin: null,
  });
}

export async function applyMode(
  set: BinSet,
  bins: BinConfig[],
  gameGuid: string | undefined,
  baseline: ModeFormValues,
  values: ModeFormValues,
): Promise<BinSet[] | null> {
  let latest: BinSet[] | null = null;
  const modeChanged = values.mode !== baseline.mode;
  if (modeChanged) latest = (await turnOff(set, baseline.mode)) ?? latest;

  const lastBin = bins[bins.length - 1];
  const hasCatchAll = bins.some((bin) => bin.isCatchAll);
  switch (values.mode) {
    case "auto-assign":
      if (modeChanged || values.autoAssignField !== baseline.autoAssignField) {
        latest = await setAutoAssignField(set.guid, values.autoAssignField);
      }
      break;
    case "scan-only":
      if (
        modeChanged ||
        values.scanOnlyMatchedBin !== baseline.scanOnlyMatchedBin ||
        values.scanOnlyUnmatchedBin !== baseline.scanOnlyUnmatchedBin
      ) {
        latest = await setScanOnly(set.guid, {
          enabled: true,
          matchedBin: values.scanOnlyMatchedBin,
          unmatchedBin: values.scanOnlyUnmatchedBin,
        });
      }
      break;
    case "repack":
      if (modeChanged) {
        latest = await setRepackConfig(set.guid, {
          isRepackMode: true,
          repackSlots: set.repackSlots,
          repackUniqueBy: set.repackUniqueBy,
          repackSiftRules: set.repackSiftRules,
        });
        if (lastBin && !lastBin.isCatchAll) await saveCatchAll(lastBin, gameGuid);
      }
      break;
    case "alphabet":
      if (modeChanged) {
        latest = await setAlphabetConfig(set.guid, { isAlphabetMode: true, pass: 0, prefix: "" });
        if (lastBin && !hasCatchAll) await saveCatchAll(lastBin, gameGuid);
      }
      break;
    case "chaos":
      if (modeChanged || values.chaosBinSize !== baseline.chaosBinSize) {
        latest = await setChaosMode(set.guid, { isChaosMode: true, chaosBinSize: chaosSize(values) });
        if (modeChanged && lastBin && !hasCatchAll) await saveCatchAll(lastBin, gameGuid);
      }
      break;
    default:
      break;
  }

  if (values.skipSaving !== baseline.skipSaving) {
    latest = await setSkipSaving(set.guid, values.skipSaving);
  }
  return latest;
}
