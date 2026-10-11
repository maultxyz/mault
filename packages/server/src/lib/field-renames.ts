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
import { bins, binSets, notificationRules, soundRules } from "../db/schema";

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
    columns: {
      id: true,
      autoAssignField: true,
      repackSlots: true,
      repackSiftRules: true,
      repackUniqueBy: true,
    },
  });

  for (const set of sets) {
    const repackSlots = (set.repackSlots as RepackSlot[]).map((slot) => ({
      ...slot,
      rule: renameRuleFields(slot.rule, renames),
    }));
    const repackSiftRules = set.repackSiftRules
      ? renameRuleFields(set.repackSiftRules as BinRuleGroup, renames)
      : null;
    const autoAssignField = set.autoAssignField
      ? renamedField(set.autoAssignField, renames)
      : null;
    const repackUniqueBy = set.repackUniqueBy
      ? renamedField(set.repackUniqueBy, renames)
      : null;
    if (
      autoAssignField !== set.autoAssignField ||
      repackUniqueBy !== set.repackUniqueBy ||
      JSON.stringify(repackSlots) !== JSON.stringify(set.repackSlots) ||
      JSON.stringify(repackSiftRules) !== JSON.stringify(set.repackSiftRules)
    ) {
      await tx
        .update(binSets)
        .set({
          autoAssignField,
          repackUniqueBy,
          repackSlots,
          repackSiftRules,
          updatedAt: new Date(),
        })
        .where(eq(binSets.id, set.id));
    }

    const setBins = await tx.query.bins.findMany({
      where: eq(bins.binSet, set.id),
      columns: { id: true, rules: true, maxCopiesBy: true },
    });
    for (const bin of setBins) {
      const rules = renameRuleFields(bin.rules as BinRuleGroup, renames);
      const maxCopiesBy = bin.maxCopiesBy
        ? renamedField(bin.maxCopiesBy, renames)
        : null;
      if (
        JSON.stringify(rules) === JSON.stringify(bin.rules) &&
        maxCopiesBy === bin.maxCopiesBy
      ) {
        continue;
      }
      await tx
        .update(bins)
        .set({ rules, maxCopiesBy, updatedAt: new Date() })
        .where(eq(bins.id, bin.id));
    }
  }

  const sounds = await tx.query.soundRules.findMany({
    where: eq(soundRules.gameId, gameId),
    columns: { id: true, rules: true },
  });
  for (const sound of sounds) {
    const rules = renameRuleFields(sound.rules as BinRuleGroup, renames);
    if (JSON.stringify(rules) === JSON.stringify(sound.rules)) continue;
    await tx
      .update(soundRules)
      .set({ rules, updatedAt: new Date() })
      .where(eq(soundRules.id, sound.id));
  }

  const notifications = await tx.query.notificationRules.findMany({
    where: eq(notificationRules.gameId, gameId),
    columns: { id: true, rules: true },
  });
  for (const notification of notifications) {
    const rules = renameRuleFields(notification.rules as BinRuleGroup, renames);
    if (JSON.stringify(rules) === JSON.stringify(notification.rules)) continue;
    await tx
      .update(notificationRules)
      .set({ rules, updatedAt: new Date() })
      .where(eq(notificationRules.id, notification.id));
  }
}
