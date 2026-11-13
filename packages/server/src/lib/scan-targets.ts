import { and, eq } from "drizzle-orm";
import type { Transaction } from "../db";
import { collections, binSets } from "../db/schema";
import { deactivatePresetWorkflows } from "./preset-workflows";
import { activeBinSetWhere } from "../routes/bins/shared";

export async function activateScanCollection(
  tx: Transaction,
  orgId: string,
  guid: string,
): Promise<boolean> {
  const target = await tx.query.collections.findFirst({
    where: and(
      eq(collections.guid, guid),
      eq(collections.orgId, orgId),
      eq(collections.isDeleted, false),
    ),
    columns: { id: true },
  });
  if (!target) return false;
  await tx
    .update(collections)
    .set({ isActive: false })
    .where(and(eq(collections.isActive, true), eq(collections.orgId, orgId)));
  await tx
    .update(collections)
    .set({ isActive: true, updatedAt: new Date() })
    .where(eq(collections.id, target.id));
  return true;
}

export async function activateScanPreset(
  tx: Transaction,
  orgId: string,
  guid: string,
): Promise<boolean> {
  const target = await tx.query.binSets.findFirst({
    where: and(
      eq(binSets.guid, guid),
      eq(binSets.orgId, orgId),
      eq(binSets.isDeleted, false),
    ),
    columns: { id: true, gameId: true },
  });
  if (!target) return false;
  await tx
    .update(binSets)
    .set({ isActive: false })
    .where(activeBinSetWhere(binSets, orgId, target.gameId));
  await tx
    .update(binSets)
    .set({ isActive: true })
    .where(eq(binSets.id, target.id));
  await deactivatePresetWorkflows(tx, orgId, target.gameId);
  return true;
}
