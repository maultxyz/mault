import {
  INVENTORY_HISTORY_DAYS,
  PRICE_SOURCE_FIELDS,
  STATS_DEFAULT_RANGE,
  STATS_RANGES,
  type StatsRange,
  type StatsReport,
} from "@magic-vault/shared";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { loadBusinessAccess } from "../../lib/business-access";
import { ONE_DAY_MS } from "../../lib/constants/timing";
import {
  loadInventoryHistory,
  writeInventorySnapshot,
} from "../../lib/inventory";
import { loadOrgPricing } from "../../lib/price-source";
import { loadStatsReport } from "../../lib/stats-report";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { databaseErrorResponse } from "../../lib/database-error-response";

function parseRange(value: string | undefined): StatsRange {
  return STATS_RANGES.find((range) => range === value) ?? STATS_DEFAULT_RANGE;
}

function hideCosts(report: StatsReport): StatsReport {
  const hidden = { costBasis: null, costedCount: null, costedValue: null };
  return {
    ...report,
    costsVisible: false,
    valueHistory: null,
    totals: { ...report.totals, ...hidden },
    collections: report.collections.map((row) => ({ ...row, ...hidden })),
  };
}

const router = new Hono<AppEnv>().get(
  "/",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    try {
      const result = await authQuery(c.get("jwtClaims"), async (tx) => {
        const report = await loadStatsReport(
          tx,
          orgId,
          parseRange(c.req.query("range")),
          c.req.query("collection") || null,
        );
        if (!report) return null;
        const access = await loadBusinessAccess(tx, orgId, c.get("orgRole"));
        if (!access.canViewCosts) return { report: hideCosts(report), snapshot: null };
        if (report.scope !== "org") return { report, snapshot: null };
        const currency =
          PRICE_SOURCE_FIELDS[(await loadOrgPricing(tx, orgId)).source].currency;
        const since = new Date(Date.now() - INVENTORY_HISTORY_DAYS * ONE_DAY_MS)
          .toISOString()
          .slice(0, 10);
        return {
          report: {
            ...report,
            valueHistory: await loadInventoryHistory(tx, orgId, currency, since),
          },
          snapshot: { currency, totals: report.totals },
        };
      });
      if (!result) {
        return c.json(
          { success: false, message: "Collection not found." },
          404,
        );
      }
      if (result.snapshot) {
        const { totals, currency } = result.snapshot;
        void writeInventorySnapshot(
          orgId,
          {
            cardCount: totals.cardCount,
            marketValue: totals.totalValue,
            costBasis: totals.costBasis ?? 0,
            costedCards: totals.costedCount ?? 0,
            costedMarketValue: totals.costedValue ?? 0,
          },
          currency,
        ).catch((err) => console.error("[stats] snapshot:", err));
      }
      return c.json({ success: true, data: result.report });
    } catch (err) {
      return databaseErrorResponse(c, err);
    }
  },
);

export { router as statsRouter };
