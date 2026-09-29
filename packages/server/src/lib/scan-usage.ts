import { and, eq, sql } from "drizzle-orm";
import { db, type Transaction } from "../db";
import { orgDailyScanUsage } from "../db/schema";
import { FREE_PLAN_DAILY_SCAN_LIMIT, isBillingEnabled } from "./stripe";

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export function dailyScanLimitForPlan(plan: string | undefined): number | null {
  if (!isBillingEnabled()) return null;
  return (plan ?? "free") === "free" ? FREE_PLAN_DAILY_SCAN_LIMIT : null;
}

export async function consumeDailyScan(
  orgId: string,
  plan: string | undefined,
): Promise<boolean> {
  const limit = dailyScanLimitForPlan(plan);
  const rows = await db
    .insert(orgDailyScanUsage)
    .values({ orgId, day: todayUtc(), scanCount: 1 })
    .onConflictDoUpdate({
      target: [orgDailyScanUsage.orgId, orgDailyScanUsage.day],
      set: {
        scanCount: sql`${orgDailyScanUsage.scanCount} + 1`,
        updatedAt: new Date(),
      },
      setWhere:
        limit == null ? undefined : sql`${orgDailyScanUsage.scanCount} < ${limit}`,
    })
    .returning({ scanCount: orgDailyScanUsage.scanCount });
  return rows.length > 0;
}

export async function getScansToday(
  tx: Transaction,
  orgId: string,
): Promise<number> {
  const [row] = await tx
    .select({ scanCount: orgDailyScanUsage.scanCount })
    .from(orgDailyScanUsage)
    .where(
      and(
        eq(orgDailyScanUsage.orgId, orgId),
        eq(orgDailyScanUsage.day, todayUtc()),
      ),
    );
  return row?.scanCount ?? 0;
}
