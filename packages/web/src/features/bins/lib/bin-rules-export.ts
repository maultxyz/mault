import {
  binRulesExportSchema,
  type BinRulesExport,
} from "@/schemas/bin-rules-export.schema";
import {
  DEFAULT_BIN_CAPACITY,
  SET_NAME_MAX_LENGTH,
  type BinConfig,
  type BinSet,
} from "@magic-vault/shared";

export function buildBinRulesExport(
  name: string,
  gameKey: string | null,
  configs: BinConfig[],
): BinRulesExport {
  return {
    formatVersion: 1,
    name,
    gameKey,
    bins: configs.map((c) => ({
      binNumber: c.binNumber,
      rules: c.rules,
      isCatchAll: !!c.isCatchAll,
      isOverride: !c.isCatchAll && !!c.isOverride,
      cardLimit: c.cardLimit === undefined ? DEFAULT_BIN_CAPACITY : c.cardLimit,
    })),
  };
}

export function serializeBinRulesExport(data: BinRulesExport): string {
  return JSON.stringify(data, null, 2);
}

export function parseBinRulesExport(text: string): BinRulesExport {
  return binRulesExportSchema.parse(JSON.parse(text));
}

export function downloadBinRulesExport(data: BinRulesExport): void {
  const blob = new Blob([serializeBinRulesExport(data)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  a.download = `magic-vault-bin-rules-${slug}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Preset names are unique per game, so an import that collides gets a
// numbered suffix instead of failing.
export function uniqueImportedName(
  base: string,
  sets: BinSet[],
  suffix: string,
): string {
  const taken = new Set(sets.map((s) => s.name.trim().toLowerCase()));
  const withTail = (tail: string) =>
    `${base.slice(0, SET_NAME_MAX_LENGTH - tail.length - 1).trim()} ${tail}`;
  for (let n = 1; ; n++) {
    const candidate = withTail(n === 1 ? suffix : `${suffix} ${n}`);
    if (!taken.has(candidate.toLowerCase())) return candidate;
  }
}
