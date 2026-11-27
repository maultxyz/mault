import { SET_NAME_MAX_LENGTH } from "./constants/sort-bins.constant";
import { parseLegacyCatchAllThreshold } from "./evaluate-bin";
import type { BinConfig, BinSet } from "./interfaces/sort-bins.interface";
import { binRulesExportSchema, type BinRulesExport } from "./schemas/bin-rules.schema";

export const BIN_RULES_EXPORT_FORMAT_VERSION = 3;
export const BIN_RULES_EXPORT_CATCH_ALL_RULES_SINCE = 2;
export const BIN_RULES_EXPORT_LOW_MATCH_COLUMN_SINCE = 3;

export function buildBinRulesExport(name: string, gameKey: string | null, configs: BinConfig[]): BinRulesExport {
  return {
    formatVersion: BIN_RULES_EXPORT_FORMAT_VERSION,
    name,
    gameKey,
    bins: configs.map((c) => ({
      binNumber: c.binNumber,
      rules: c.rules,
      isCatchAll: !!c.isCatchAll,
      isOverride: !c.isCatchAll && !!c.isOverride,
      overridePriority: c.isCatchAll || c.isOverride ? (c.overridePriority ?? null) : null,
      lowMatchPercent: c.isCatchAll ? (c.lowMatchPercent ?? null) : null,
      maxCopies: c.isCatchAll ? null : (c.maxCopies ?? null),
      maxCopiesBy: c.isCatchAll || c.maxCopies == null ? null : (c.maxCopiesBy ?? null),
      maxCards: c.maxCards ?? null,
      overflowBin: c.overflowBin ?? null,
      isDisabled: !c.isCatchAll && !!c.isDisabled,
    })),
  };
}

export function serializeBinRulesExport(data: BinRulesExport): string {
  return JSON.stringify(data, null, 2);
}

export function binRulesExportFilename(data: BinRulesExport): string {
  const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return `magic-vault-bin-rules-${slug}.json`;
}

export function parseBinRulesExport(text: string): BinRulesExport {
  const data = binRulesExportSchema.parse(JSON.parse(text));
  if (data.formatVersion >= BIN_RULES_EXPORT_LOW_MATCH_COLUMN_SINCE) return data;
  const keepsThreshold = data.formatVersion >= BIN_RULES_EXPORT_CATCH_ALL_RULES_SINCE;
  return {
    ...data,
    bins: data.bins.map((bin) =>
      bin.isCatchAll
        ? {
            ...bin,
            rules: { ...bin.rules, conditions: [] },
            lowMatchPercent: keepsThreshold ? parseLegacyCatchAllThreshold(bin.rules) : null,
          }
        : bin,
    ),
  };
}

export function uniqueImportedName(base: string, sets: BinSet[], suffix: string): string {
  const taken = new Set(sets.map((s) => s.name.trim().toLowerCase()));
  const withTail = (tail: string) => `${base.slice(0, SET_NAME_MAX_LENGTH - tail.length - 1).trim()} ${tail}`;
  for (let n = 1; ; n++) {
    const candidate = withTail(n === 1 ? suffix : `${suffix} ${n}`);
    if (!taken.has(candidate.toLowerCase())) return candidate;
  }
}
