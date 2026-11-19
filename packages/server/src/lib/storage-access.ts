import { and, count, eq } from "drizzle-orm";
import type { Transaction } from "../db";
import { storageLocations } from "../db/schema";

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
