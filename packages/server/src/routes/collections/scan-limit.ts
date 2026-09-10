import { and, eq, gte, sql } from "drizzle-orm";
import type { Transaction } from "../../db";
import { collectionCards, orgBilling } from "../../db/schema";
import { FREE_PLAN_DAILY_SCAN_LIMIT, isBillingEnabled } from "../../lib/stripe";

// Whether this org has hit its free-plan daily scan cap - always false when
// billing isn't enabled (self-hosted) or the org is on a paid plan.
export async function isOverFreeScanLimit(
  tx: Transaction,
  orgId: string,
): Promise<boolean> {
  if (!isBillingEnabled()) return false;

  const billing = await tx.query.orgBilling.findFirst({
    where: eq(orgBilling.orgId, orgId),
    columns: { plan: true },
  });
  if ((billing?.plan ?? "free") !== "free") return false;

  const startOfTodayUtc = new Date();
  startOfTodayUtc.setUTCHours(0, 0, 0, 0);
  const [{ scannedToday }] = await tx
    .select({ scannedToday: sql<number>`count(*)::int` })
    .from(collectionCards)
    .where(
      and(
        eq(collectionCards.orgId, orgId),
        gte(collectionCards.scannedAt, startOfTodayUtc),
      ),
    );
  return scannedToday >= FREE_PLAN_DAILY_SCAN_LIMIT;
}
