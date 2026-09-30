import {
  renamedField,
  renameRuleFields,
  type BinRuleGroup,
  type FieldMeta,
  type FieldRenames,
  type RepackSlot,
} from "@magic-vault/shared";
import { eq } from "drizzle-orm";
import type { Transaction } from "../db";
import { bins, binSets } from "../db/schema";

export function validFieldRenames(
  requested: FieldRenames | undefined,
  previous: FieldMeta[],
  next: FieldMeta[],
): FieldRenames {
  if (!requested) return {};
  const previousKeys = new Set(previous.map((f) => f.field));
  const nextKeys = new Set(next.map((f) => f.field));
  const renames: FieldRenames = {};
  for (const [from, to] of Object.entries(requested)) {
    if (from !== to && previousKeys.has(from) && nextKeys.has(to)) {
      renames[from] = to;
    }
  }
  return renames;
}

export async function applyFieldRenames(
  tx: Transaction,
  gameId: number,
  renames: FieldRenames,
): Promise<void> {
  if (Object.keys(renames).length === 0) return;

  const sets = await tx.query.binSets.findMany({
    where: eq(binSets.gameId, gameId),
    columns: { id: true, autoAssignField: true, repackSlots: true },
  });

  for (const set of sets) {
    const repackSlots = (set.repackSlots as RepackSlot[]).map((slot) => ({
      ...slot,
      rule: renameRuleFields(slot.rule, renames),
    }));
    const autoAssignField = set.autoAssignField
      ? renamedField(set.autoAssignField, renames)
      : null;
    if (
      autoAssignField !== set.autoAssignField ||
      JSON.stringify(repackSlots) !== JSON.stringify(set.repackSlots)
    ) {
      await tx
        .update(binSets)
        .set({ autoAssignField, repackSlots, updatedAt: new Date() })
        .where(eq(binSets.id, set.id));
    }

    const setBins = await tx.query.bins.findMany({
      where: eq(bins.binSet, set.id),
      columns: { id: true, rules: true },
    });
    for (const bin of setBins) {
      const rules = renameRuleFields(bin.rules as BinRuleGroup, renames);
      if (JSON.stringify(rules) === JSON.stringify(bin.rules)) continue;
      await tx
        .update(bins)
        .set({ rules, updatedAt: new Date() })
        .where(eq(bins.id, bin.id));
    }
  }
}
