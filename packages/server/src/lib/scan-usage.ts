import { and, eq, sql } from "drizzle-orm";
import { db, type Transaction } from "../db";
import { orgDailyScanUsage } from "../db/schema";
import { planLimit } from "./plan-config";

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export function dailyScanLimitForPlan(plan: string | undefined): number | null {
  return planLimit(plan, "dailyScans");
}

export function dailyScanLimitMessage(limit: number | null): string {
  return `Daily scan limit reached (${limit ?? 0}/day). Upgrade to Business for unlimited scanning.`;
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
