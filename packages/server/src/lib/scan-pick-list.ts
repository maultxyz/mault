import {
  applyPickListFound,
  toPickList,
  type PickList,
  type PickListFoundResult,
  type ScanSavePickListUpdate,
} from "@magic-vault/shared";
import { and, eq } from "drizzle-orm";
import type { PgInsertValue } from "drizzle-orm/pg-core";
import type { Transaction } from "../db";
import { bins, collectionCards } from "../db/schema";

export async function updateBinPickList(
  tx: Transaction,
  orgId: string,
  binGuid: string,
  update: (current: PickList) => PickList | null,
): Promise<PickListFoundResult | null> {
  const [target] = await tx
    .select({ id: bins.id, pickList: bins.pickList })
    .from(bins)
    .where(
      and(
        eq(bins.guid, binGuid),
        eq(bins.orgId, orgId),
        eq(bins.isDeleted, false),
      ),
    )
    .for("update");
  if (!target) return null;
  const current = toPickList(target.pickList);
  const next = current ? update(current) : null;
  if (!next) return { changed: false, pickList: current };
  await tx.update(bins).set({ pickList: next }).where(eq(bins.id, target.id));
  return { changed: true, pickList: next };
}

export function isScanSavePickListUpdate(
  value: unknown,
): value is ScanSavePickListUpdate {
  if (!value || typeof value !== "object") return false;
  const update = value as Partial<ScanSavePickListUpdate>;
  return (
    typeof update.binGuid === "string" && update.binGuid.length > 0 &&
    typeof update.name === "string" && update.name.length > 0 && update.delta === 1
  );
}

export async function applyScanPickListUpdate(
  tx: Transaction,
  orgId: string,
  update: ScanSavePickListUpdate | undefined,
): Promise<void> {
  if (!update) return;
  const result = await updateBinPickList(tx, orgId, update.binGuid, (current) =>
    applyPickListFound(current, update.name, update.delta),
  );
  if (!result?.pickList)
    console.warn(
      `[scan-pick-list] bin ${update.binGuid} has no pick list, scan saved without pick progress`,
    );
}

export async function insertScanWithPickList(
  tx: Transaction,
  values: PgInsertValue<typeof collectionCards> & { orgId: string },
  update: ScanSavePickListUpdate | undefined,
): Promise<void> {
  const inserted = await tx
    .insert(collectionCards)
    .values(values)
    .onConflictDoNothing()
    .returning({ id: collectionCards.id });
  if (inserted.length > 0)
    await applyScanPickListUpdate(tx, values.orgId, update);
}
