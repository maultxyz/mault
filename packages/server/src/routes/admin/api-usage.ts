import {
  API_USAGE_REPORT_DAYS,
  DEFAULT_API_USAGE_REPORT_DAYS,
  type ApiUsageReport,
} from "@magic-vault/shared";
import { desc, eq, gte, sql } from "drizzle-orm";
import { Hono } from "hono";
import { authProvider } from "../../auth";
import { db } from "../../db";
import {
  apiKeyUsageDaily,
  orgApiKeys,
  publicRouteUsageDaily,
} from "../../db/schema";
import { API_USAGE_REPORT_ROW_LIMIT } from "../../lib/constants/api-keys";
import { ONE_DAY_MS } from "../../lib/constants/timing";
import { requireAuth, requireRole, type AppEnv } from "../../middleware/auth";

export const apiUsageRoute = new Hono<AppEnv>().get(
  "/api-usage",
  requireAuth,
  requireRole("admin"),
  async (c) => {
    const requestedDays = Number(c.req.query("days") ?? DEFAULT_API_USAGE_REPORT_DAYS);
    if (!(API_USAGE_REPORT_DAYS as readonly number[]).includes(requestedDays)) {
      return c.json({ success: false, message: "Invalid day range." }, 400);
    }
    const firstDay = new Date(Date.now() - (requestedDays - 1) * ONE_DAY_MS)
      .toISOString()
      .slice(0, 10);

    const apiKeyRequestCount = sql<number>`sum(${apiKeyUsageDaily.requestCount})::int`;
    const apiKeyRows = await db
      .select({
        orgId: apiKeyUsageDaily.orgId,
        apiKeyName: orgApiKeys.name,
        apiKeyPrefix: orgApiKeys.keyPrefix,
        apiKeyRevokedAt: orgApiKeys.revokedAt,
        endpoint: apiKeyUsageDaily.endpoint,
        requestCount: apiKeyRequestCount,
        rateLimitedCount: sql<number>`sum(${apiKeyUsageDaily.rateLimitedCount})::int`,
        lastRequestAt: sql<Date>`max(${apiKeyUsageDaily.lastRequestAt})`,
      })
      .from(apiKeyUsageDaily)
      .innerJoin(orgApiKeys, eq(orgApiKeys.id, apiKeyUsageDaily.apiKeyId))
      .where(gte(apiKeyUsageDaily.day, firstDay))
      .groupBy(
        apiKeyUsageDaily.orgId,
        orgApiKeys.id,
        orgApiKeys.name,
        orgApiKeys.keyPrefix,
        orgApiKeys.revokedAt,
        apiKeyUsageDaily.endpoint,
      )
      .orderBy(desc(apiKeyRequestCount))
      .limit(API_USAGE_REPORT_ROW_LIMIT);

    const publicRouteRequestCount = sql<number>`sum(${publicRouteUsageDaily.requestCount})::int`;
    const publicRouteRows = await db
      .select({
        endpoint: publicRouteUsageDaily.endpoint,
        requestCount: publicRouteRequestCount,
        rateLimitedCount: sql<number>`sum(${publicRouteUsageDaily.rateLimitedCount})::int`,
        lastRequestAt: sql<Date>`max(${publicRouteUsageDaily.lastRequestAt})`,
      })
      .from(publicRouteUsageDaily)
      .where(gte(publicRouteUsageDaily.day, firstDay))
      .groupBy(publicRouteUsageDaily.endpoint)
      .orderBy(desc(publicRouteRequestCount))
      .limit(API_USAGE_REPORT_ROW_LIMIT);

    const orgNames = await authProvider.getOrganisationNames([
      ...new Set(apiKeyRows.map((row) => row.orgId)),
    ]);
    const report: ApiUsageReport = {
      days: requestedDays,
      apiKeys: apiKeyRows.map((row) => ({
        orgId: row.orgId,
        orgName: orgNames.get(row.orgId) ?? null,
        apiKeyName: row.apiKeyName,
        apiKeyPrefix: row.apiKeyPrefix,
        isApiKeyRevoked: row.apiKeyRevokedAt != null,
        endpoint: row.endpoint,
        requestCount: row.requestCount,
        rateLimitedCount: row.rateLimitedCount,
        lastRequestAt: new Date(row.lastRequestAt).toISOString(),
      })),
      publicRoutes: publicRouteRows.map((row) => ({
        endpoint: row.endpoint,
        requestCount: row.requestCount,
        rateLimitedCount: row.rateLimitedCount,
        lastRequestAt: new Date(row.lastRequestAt).toISOString(),
      })),
    };
    return c.json({ success: true, data: report });
  },
);
