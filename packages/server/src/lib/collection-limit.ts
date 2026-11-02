import { and, count, eq } from "drizzle-orm";
import type { Transaction } from "../db";
import { collections } from "../db/schema";
import { loadPlanForOrg, planLimit } from "./plan-config";

export function collectionLimitForPlan(plan: string | undefined): number | null {
  return planLimit(plan, "collections");
}

export async function getCollectionLimit(
  tx: Transaction,
  orgId: string,
): Promise<number | null> {
  return collectionLimitForPlan(await loadPlanForOrg(tx, orgId));
}

export async function countLiveCollections(
  tx: Transaction,
  orgId: string,
): Promise<number> {
  const [row] = await tx
    .select({ total: count() })
    .from(collections)
    .where(and(eq(collections.orgId, orgId), eq(collections.isDeleted, false)));
  return row?.total ?? 0;
}

export function collectionLimitMessage(limit: number): string {
  return `Your plan allows ${limit} collection${limit === 1 ? "" : "s"}. Upgrade your plan to add more.`;
}
