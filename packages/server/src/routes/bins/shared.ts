import type {
  BinConfig,
  BinRuleGroup,
  BinSet,
  FieldMeta,
  RepackSlot,
} from "@magic-vault/shared";
import { and, eq, sql } from "drizzle-orm";
import { listOrgDevices } from "../../lib/devices";
import type { Transaction } from "../../db";
import { bins, binSetAudit } from "../../db/schema";

export async function getModuleCount(
  tx: Transaction,
  orgId: string,
): Promise<number> {
  const devices = await listOrgDevices(tx, orgId);
  return Math.max(...devices.map((d) => d.moduleCount));
}

export function toIsDisabled(
  value: boolean | undefined,
  isCatchAll: boolean | undefined,
): boolean {
  return !isCatchAll && value === true;
}

export function toMaxCopies(
  value: number | null | undefined,
  isCatchAll: boolean | undefined,
): number | null {
  if (isCatchAll || value == null) return null;
  return Number.isInteger(value) && value >= 1 ? value : null;
}

export function emptyRules(): BinRuleGroup {
  return {
    id: crypto.randomUUID(),
    combinator: "and" as const,
    conditions: [],
  };
}

function toBinSet(row: {
  guid: string | null;
  name: string;
  isActive: boolean;
  autoAssignField: string | null;
  scanOnly: boolean;
  isRepackMode: boolean;
  repackSlots: unknown;
  repackAllowDuplicates: boolean;
  repackSiftRules: unknown;
  isAlphabetMode: boolean;
  alphabetPass: number;
  alphabetPrefix: string;
  isChaosMode: boolean;
  chaosBinSize: number | null;
  createdAt: Date;
  updatedAt: Date;
  bins: {
    guid: string | null;
    binNumber: number;
    rules: unknown;
    isCatchAll: boolean;
    isOverride: boolean;
    cardLimit: number | null;
    maxCopies: number | null;
    isDisabled: boolean;
    lastEmptiedAt: Date | null;
  }[];
  game: {
    guid: string | null;
    key: string;
    name: string;
    isActive: boolean;
    fieldDefinitions: unknown;
    foilTypes: unknown;
    apiDocsUrl: string | null;
    cardThickness: number | null;
    createdAt: Date;
    updatedAt: Date;
  } | null;
}): BinSet {
  return {
    guid: row.guid!,
    name: row.name,
    isActive: row.isActive,
    autoAssignField: row.autoAssignField,
    scanOnly: row.scanOnly,
    isRepackMode: row.isRepackMode,
    repackSlots: (row.repackSlots as RepackSlot[] | null) ?? [],
    repackAllowDuplicates: row.repackAllowDuplicates,
    repackSiftRules: (row.repackSiftRules as BinRuleGroup | null) ?? null,
    isAlphabetMode: row.isAlphabetMode,
    alphabetPass: row.alphabetPass,
    alphabetPrefix: row.alphabetPrefix,
    isChaosMode: row.isChaosMode,
    chaosBinSize: row.chaosBinSize,
    bins: row.bins.map((bin) => ({
      guid: bin.guid!,
      binNumber: bin.binNumber,
      rules: bin.rules as BinRuleGroup,
      isCatchAll: bin.isCatchAll,
      isOverride: bin.isOverride,
      cardLimit: bin.cardLimit,
      maxCopies: bin.maxCopies,
      isDisabled: bin.isDisabled,
      lastEmptiedAt: bin.lastEmptiedAt ? bin.lastEmptiedAt.getTime() : null,
    })),
    game: row.game
      ? {
          guid: row.game.guid!,
          key: row.game.key,
          name: row.game.name,
          isActive: row.game.isActive,
          fieldDefinitions: row.game.fieldDefinitions as FieldMeta[],
          foilTypes: (row.game.foilTypes as string[] | null) ?? [],
          apiDocsUrl: row.game.apiDocsUrl,
          cardThickness: row.game.cardThickness,
          createdAt: row.game.createdAt,
          updatedAt: row.game.updatedAt,
        }
      : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

const binSetQuery = {
  columns: {
    guid: true,
    name: true,
    isActive: true,
    autoAssignField: true,
    scanOnly: true,
    isRepackMode: true,
    repackSlots: true,
    repackAllowDuplicates: true,
    repackSiftRules: true,
    isAlphabetMode: true,
    alphabetPass: true,
    alphabetPrefix: true,
    isChaosMode: true,
    chaosBinSize: true,
    createdAt: true,
    updatedAt: true,
  },
  with: {
    bins: {
      columns: {
        guid: true,
        binNumber: true,
        rules: true,
        isCatchAll: true,
        isOverride: true,
        cardLimit: true,
        maxCopies: true,
        isDisabled: true,
        lastEmptiedAt: true,
      },
    },
    game: true,
  },
} as const;

export async function loadSets(tx: Transaction, orgId: string) {
  const rows = await tx.query.binSets.findMany({
    ...binSetQuery,
    where: (binSets, { eq }) => eq(binSets.orgId, orgId),
    orderBy: (binSets, { desc }) => [desc(binSets.updatedAt)],
  });
  return { message: "Loaded sets.", success: true, data: rows.map(toBinSet) };
}

export async function snapshotBinSet(
  tx: Transaction,
  binSetId: number,
  binSetGuid: string,
  orgId: string,
) {
  const rows = await tx.query.bins.findMany({
    where: (bins, { eq }) => eq(bins.binSet, binSetId),
    columns: {
      guid: true,
      binNumber: true,
      rules: true,
      isCatchAll: true,
      isOverride: true,
      cardLimit: true,
      maxCopies: true,
      isDisabled: true,
    },
  });
  const snapshot: BinConfig[] = rows.map((r) => ({
    guid: r.guid!,
    binNumber: r.binNumber,
    rules: r.rules as BinRuleGroup,
    isCatchAll: r.isCatchAll,
    isOverride: r.isOverride,
    cardLimit: r.cardLimit,
    maxCopies: r.maxCopies,
    isDisabled: r.isDisabled,
  }));
  await tx.insert(binSetAudit).values({ binSetGuid, snapshot, orgId });
}

// Resolves a game guid (from the client) to its internal id, or null if
// omitted - bin sets with no game are legacy/game-agnostic sets.
export async function resolveGameId(
  tx: Transaction,
  gameGuid: string | undefined,
): Promise<number | null> {
  if (!gameGuid) return null;
  const game = await tx.query.games.findFirst({
    where: (t, { eq }) => eq(t.guid, gameGuid),
    columns: { id: true },
  });
  return game?.id ?? null;
}

export async function binSetNameTaken(
  tx: Transaction,
  orgId: string,
  gameId: number | null,
  name: string,
  excludeGuid?: string,
): Promise<boolean> {
  const trimmed = name.trim().toLowerCase();
  const existing = await tx.query.binSets.findFirst({
    where: (t, { eq, and, isNull }) =>
      and(
        eq(t.orgId, orgId),
        gameId === null ? isNull(t.gameId) : eq(t.gameId, gameId),
        sql`lower(trim(${t.name})) = ${trimmed}`,
      ),
    columns: { guid: true },
  });
  if (!existing) return false;
  return existing.guid !== excludeGuid;
}

export async function resetAutoAssignBins(tx: Transaction, binSetId: number) {
  await tx
    .update(bins)
    .set({
      rules: emptyRules(),
      isOverride: false,
      maxCopies: null,
      updatedAt: new Date(),
    })
    .where(and(eq(bins.binSet, binSetId), eq(bins.isCatchAll, false)));
}

export async function clearAllBinRules(tx: Transaction, binSetId: number) {
  await tx
    .update(bins)
    .set({ rules: emptyRules(), updatedAt: new Date() })
    .where(eq(bins.binSet, binSetId));
}

const SCAN_ONLY_CATCH_ALL_BIN = 7;

export async function applyScanOnlyBins(
  tx: Transaction,
  binSetId: number,
  orgId: string,
) {
  await tx
    .update(bins)
    .set({
      rules: emptyRules(),
      isCatchAll: false,
      isOverride: false,
      updatedAt: new Date(),
    })
    .where(eq(bins.binSet, binSetId));

  const catchAllBin = await tx.query.bins.findFirst({
    where: (t, { eq, and }) =>
      and(eq(t.binSet, binSetId), eq(t.binNumber, SCAN_ONLY_CATCH_ALL_BIN)),
    columns: { id: true },
  });

  if (catchAllBin) {
    await tx
      .update(bins)
      .set({ isCatchAll: true, isDisabled: false, updatedAt: new Date() })
      .where(eq(bins.id, catchAllBin.id));
  } else {
    await tx.insert(bins).values({
      binNumber: SCAN_ONLY_CATCH_ALL_BIN,
      rules: emptyRules(),
      isCatchAll: true,
      isOverride: false,
      binSet: binSetId,
      orgId,
    });
  }
}
