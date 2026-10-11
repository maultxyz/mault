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
  return `**Bin ${bin.binNumber}:** ${parts.join(", ")}`;
}

// A human-readable summary of the collection's active sorting rules, posted
// to Discord at the start of a scan session so viewers can see what's
// configured without opening the app.
function copiesByLabel(copiesBy: string | null): string {
  if (!copiesBy || copiesBy === REPACK_UNIQUE_BY_PRINTING) return "printing";
  if (copiesBy === REPACK_UNIQUE_BY_NAME) return "name";
  return copiesBy;
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
      isDisabled: bins.isDisabled,
    })
    .from(bins)
    .where(and(eq(bins.binSet, set.id), eq(bins.isDeleted, false)))
    .orderBy(bins.binNumber);

  if (binRows.length === 0)
    return `**Sorting logic:** ${set.name} (no bins configured)`;

  const lines = binRows.map((b) =>
    b.isCatchAll
      ? catchAllSummary({ ...b, rules: b.rules as BinRuleGroup })
      : b.isDisabled
        ? `**Bin ${b.binNumber}:** disabled`
        : `**Bin ${b.binNumber}${b.isOverride ? ` (override${priorityLabel(b.overridePriority)})` : ""}${b.maxCopies != null ? ` (max ${b.maxCopies} per ${copiesByLabel(b.maxCopiesBy)})` : ""}:** ${describeRuleGroup(b.rules as BinRuleGroup)}`,
  );

  return `**Sorting logic:** ${set.name}\n${lines.join("\n")}`;
}
