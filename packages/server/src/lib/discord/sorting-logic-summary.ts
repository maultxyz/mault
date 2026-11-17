import {
  isRuleGroup,
  REPACK_UNIQUE_BY_NAME,
  REPACK_UNIQUE_BY_PRINTING,
  type BinCondition,
  type BinRuleGroup,
} from "@magic-vault/shared";
import { and, eq } from "drizzle-orm";
import { db } from "../../db";
import { bins, binSets } from "../../db/schema";

const OPERATOR_TEXT: Record<string, string> = {
  equals: "is",
  not_equals: "is not",
  contains: "contains",
  not_contains: "does not contain",
  starts_with: "starts with",
  ends_with: "ends with",
  gt: ">",
  gte: "≥",
  lt: "<",
  lte: "≤",
  in: "is one of",
  not_in: "is not one of",
  contains_any: "contains any of",
  contains_all: "contains all of",
  contains_none: "contains none of",
  count_equals: "item count =",
  count_gt: "item count >",
  count_lt: "item count <",
};

function describeCondition(cond: BinCondition): string {
  const value = Array.isArray(cond.value)
    ? cond.value.join(", ")
    : String(cond.value);
  return `${cond.field} ${OPERATOR_TEXT[cond.operator] ?? cond.operator} ${value}`;
}

function describeRuleGroup(group: BinRuleGroup): string {
  if (!group.conditions || group.conditions.length === 0) return "always";
  const parts = group.conditions.map((c) =>
    isRuleGroup(c) ? `(${describeRuleGroup(c)})` : describeCondition(c),
  );
  return parts.join(group.combinator === "and" ? " AND " : " OR ");
}

function priorityLabel(priority: number | null): string {
  return priority == null ? "" : `, priority ${priority}`;
}

function catchAllSummary(bin: {
  binNumber: number;
  rules: BinRuleGroup;
  lowMatchPercent: number | null;
  overridePriority: number | null;
  overflowBin: number | null;
}): string {
  const parts = ["everything else"];
  if (bin.rules.conditions?.length > 0) {
    parts.push(
      `plus override (${describeRuleGroup(bin.rules)})${priorityLabel(bin.overridePriority)}`,
    );
  }
  if (bin.lowMatchPercent != null) {
    parts.push(`plus scans below ${bin.lowMatchPercent}% match`);
  }
  if (bin.overflowBin != null) {
    parts.push(`overflows to bin ${bin.overflowBin}`);
  }
  return `**Bin ${bin.binNumber}:** ${parts.join(", ")}`;
}

function copiesByLabel(copiesBy: string | null): string {
  if (!copiesBy || copiesBy === REPACK_UNIQUE_BY_PRINTING) return "printing";
  if (copiesBy === REPACK_UNIQUE_BY_NAME) return "name";
  return copiesBy;
}

export async function buildPresetBinLines(binSetId: number): Promise<string[]> {
  const binRows = await db
    .select({
      binNumber: bins.binNumber,
      rules: bins.rules,
      isCatchAll: bins.isCatchAll,
      isOverride: bins.isOverride,
      overridePriority: bins.overridePriority,
      lowMatchPercent: bins.lowMatchPercent,
      maxCopies: bins.maxCopies,
      maxCopiesBy: bins.maxCopiesBy,
      overflowBin: bins.overflowBin,
      isDisabled: bins.isDisabled,
    })
    .from(bins)
    .where(and(eq(bins.binSet, binSetId), eq(bins.isDeleted, false)))
    .orderBy(bins.binNumber);

  const overflowSources = (binNumber: number) =>
    binRows
      .filter((s) => s.overflowBin === binNumber && s.binNumber !== binNumber)
      .map((s) => s.binNumber);
  const overflowLabel = (overflowBin: number | null) =>
    overflowBin == null ? "" : ` (overflows to bin ${overflowBin})`;

  return binRows.map((b) => {
    if (b.isCatchAll) {
      return catchAllSummary({ ...b, rules: b.rules as BinRuleGroup });
    }
    if (b.isDisabled) return `**Bin ${b.binNumber}:** disabled`;
    const sources = overflowSources(b.binNumber);
    if (sources.length > 0) {
      return `**Bin ${b.binNumber}${overflowLabel(b.overflowBin)}:** overflow for bin ${sources.join(", ")}`;
    }
    return `**Bin ${b.binNumber}${b.isOverride ? ` (override${priorityLabel(b.overridePriority)})` : ""}${b.maxCopies != null ? ` (max ${b.maxCopies} per ${copiesByLabel(b.maxCopiesBy)})` : ""}${overflowLabel(b.overflowBin)}:** ${describeRuleGroup(b.rules as BinRuleGroup)}`;
  });
}

export async function buildSortingLogicSummary(
  orgId: string,
  gameId: number | null,
): Promise<string> {
  const setRows = await db
    .select({ id: binSets.id, name: binSets.name })
    .from(binSets)
    .where(
      gameId != null
        ? and(
            eq(binSets.orgId, orgId),
            eq(binSets.isActive, true),
            eq(binSets.isDeleted, false),
            eq(binSets.gameId, gameId),
          )
        : and(
            eq(binSets.orgId, orgId),
            eq(binSets.isActive, true),
            eq(binSets.isDeleted, false),
          ),
    )
    .limit(1);
  const set = setRows[0];
  if (!set) return "No active sorting rules configured.";

  const lines = await buildPresetBinLines(set.id);
  if (lines.length === 0)
    return `**Sorting logic:** ${set.name} (no bins configured)`;

  return `**Sorting logic:** ${set.name}\n${lines.join("\n")}`;
}
