import { and, count, eq } from "drizzle-orm";
import type { Transaction } from "../db";
import { collections } from "../db/schema";

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
