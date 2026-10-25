import {
  ACTIVITY_ACTIONS,
  ACTIVITY_PAGE_SIZE,
  ACTIVITY_PAGE_SIZE_MAX,
  STATS_RANGE_DAYS,
  type ActivityAction,
  type ActivityPage,
  type StaffReport,
  type StaffThroughputRow,
} from "@magic-vault/shared";
import { and, desc, eq, gte, isNotNull, sql } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../../db";
import { orgActivityLog, scanStats } from "../../db/schema";
import { SCAN_OUTCOME_MATCHED } from "../../lib/constants/scan-stats";
import {
  getUserDisplayName,
  requireAuth,
  requireOrg,
  type AppEnv,
} from "../../middleware/auth";
import { businessQuery, forbidden } from "./shared";
import { ONE_DAY_MS } from "../../lib/constants/timing";
import { parseStatsRange } from "../../lib/stats-range";

export const activityRoute = new Hono<AppEnv>()
  .get("/activity", requireAuth, requireOrg, (c) => {
    const pageSize = Math.min(
      Math.max(
        Number.parseInt(c.req.query("limit") ?? "", 10) || ACTIVITY_PAGE_SIZE,
        1,
      ),
      ACTIVITY_PAGE_SIZE_MAX,
    );
    const page = Math.max(Number.parseInt(c.req.query("page") ?? "", 10) || 1, 1);
    const userId = c.req.query("user") || null;
    const actionParam = c.req.query("action");
    const action = ACTIVITY_ACTIONS.includes(actionParam as ActivityAction)
      ? (actionParam as ActivityAction)
      : null;
    return businessQuery(c, async (tx, access) => {
      if (!access.canViewActivity) return forbidden;
      const where = and(
        eq(orgActivityLog.orgId, c.get("orgId")),
        userId ? eq(orgActivityLog.userId, userId) : undefined,
        action ? eq(orgActivityLog.action, action) : undefined,
      );
      const [count] = await tx
        .select({ total: sql<number>`count(*)::int` })
        .from(orgActivityLog)
        .where(where);
      const rows = await tx
        .select()
        .from(orgActivityLog)
        .where(where)
        .orderBy(desc(orgActivityLog.createdAt), desc(orgActivityLog.id))
        .limit(pageSize)
        .offset((page - 1) * pageSize);
      const entries = [];
      for (const row of rows) {
        entries.push({
          guid: row.guid!,
          action: row.action as ActivityAction,
          userId: row.userId,
          userName: row.userId ? await getUserDisplayName(row.userId) : null,
          summary: row.summary,
          details: (row.details as Record<string, unknown> | null) ?? null,
          createdAt: row.createdAt.toISOString(),
        });
      }
      const data: ActivityPage = {
        entries,
        total: Number(count?.total ?? 0),
        page,
        pageSize,
      };
      return { success: true, data };
    });
  })
  .get("/staff", requireAuth, requireOrg, (c) => {
    const range = parseStatsRange(c.req.query("range"));
    const since = new Date(Date.now() - STATS_RANGE_DAYS[range] * ONE_DAY_MS);
    return businessQuery(c, async (tx, access) => {
      if (!access.canViewActivity) return forbidden;
      const orgId = c.get("orgId");
      const scans = await db
        .select({
          userId: scanStats.scannedByUserId,
          scans: sql<number>`count(*)::int`,
          matched: sql<number>`count(*) FILTER (WHERE ${scanStats.outcome} = ${SCAN_OUTCOME_MATCHED})::int`,
          corrected: sql<number>`count(*) FILTER (WHERE ${scanStats.isCorrected})::int`,
          lastScanAt: sql<Date | null>`max(${scanStats.scannedAt})`,
        })
        .from(scanStats)
        .where(
          and(
            eq(scanStats.orgId, orgId),
            isNotNull(scanStats.scannedByUserId),
            gte(scanStats.scannedAt, since),
          ),
        )
        .groupBy(scanStats.scannedByUserId);
      const actions = await tx
        .select({
          userId: orgActivityLog.userId,
          actions: sql<number>`count(*)::int`,
        })
        .from(orgActivityLog)
        .where(
          and(
            eq(orgActivityLog.orgId, orgId),
            isNotNull(orgActivityLog.userId),
            gte(orgActivityLog.createdAt, since),
          ),
        )
        .groupBy(orgActivityLog.userId);
      const byUser = new Map<string, StaffThroughputRow>();
      const rowFor = async (userId: string) => {
        let row = byUser.get(userId);
        if (!row) {
          row = {
            userId,
            userName: await getUserDisplayName(userId),
            scans: 0,
            matched: 0,
            unmatched: 0,
            corrected: 0,
            actions: 0,
            lastScanAt: null,
          };
          byUser.set(userId, row);
        }
        return row;
      };
      for (const scan of scans) {
        if (!scan.userId) continue;
        const row = await rowFor(scan.userId);
        row.scans = Number(scan.scans);
        row.matched = Number(scan.matched);
        row.unmatched = row.scans - row.matched;
        row.corrected = Number(scan.corrected);
        row.lastScanAt = scan.lastScanAt
          ? new Date(scan.lastScanAt).toISOString()
          : null;
      }
      for (const action of actions) {
        if (!action.userId) continue;
        (await rowFor(action.userId)).actions = Number(action.actions);
      }
      const data: StaffReport = {
        range,
        rows: [...byUser.values()].sort((a, b) => b.scans - a.scans),
      };
      return { success: true, data };
    });
  });
