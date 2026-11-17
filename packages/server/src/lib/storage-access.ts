import { and, count, eq } from "drizzle-orm";
import type { Transaction } from "../db";
import { storageLocations } from "../db/schema";
import { orgHasFeature, planHasFeature } from "./plan-config";

export const STORAGE_UPGRADE_MESSAGE =
  "Storage locations are not part of your plan. Upgrade your plan to use them.";

export function storageAllowedForPlan(plan: string | undefined): boolean {
  return planHasFeature(plan, "storage");
}

export function isStorageAllowed(
  tx: Transaction,
  orgId: string,
): Promise<boolean> {
  return orgHasFeature(tx, orgId, "storage");
}

export async function countLiveStorageLocations(
  tx: Transaction,
  orgId: string,
): Promise<number> {
  const [row] = await tx
    .select({ total: count() })
    .from(storageLocations)
    .where(
      and(
        eq(storageLocations.orgId, orgId),
        eq(storageLocations.isDeleted, false),
      ),
    );
  return row?.total ?? 0;
}
