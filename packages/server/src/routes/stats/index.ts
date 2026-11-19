import {
  INVENTORY_HISTORY_DAYS,
  type StatsReport,
} from "@magic-vault/shared";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { loadBusinessAccess } from "../../lib/business-access";
import { ONE_DAY_MS } from "../../lib/constants/timing";
import {
  isInventorySnapshotDue,
  loadCachedInventoryHistory,
  writeInventorySnapshot,
} from "../../lib/inventory";
import { loadCachedStatsReport } from "../../lib/stats-report";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { parseStatsRange } from "../../lib/stats-range";

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
    const jwtClaims = c.get("jwtClaims");
    const [loaded, access] = await Promise.all([
      loadCachedStatsReport(
        jwtClaims,
        orgId,
        parseStatsRange(c.req.query("range")),
        c.req.query("collection") || null,
      ),
      authQuery(jwtClaims, (tx) => loadBusinessAccess(tx, orgId, c.get("orgRole"))),
    ]);
    if (!loaded) {
      return c.json(
        { success: false, message: "Collection not found." },
        404,
      );
    }
    const { report, currency } = loaded;
    if (!access.canViewCosts) {
      return c.json({ success: true, data: hideCosts(report) });
    }
    if (report.scope !== "org") {
      return c.json({ success: true, data: report });
    }
    const since = new Date(Date.now() - INVENTORY_HISTORY_DAYS * ONE_DAY_MS)
      .toISOString()
      .slice(0, 10);
    const valueHistory = await loadCachedInventoryHistory(jwtClaims, orgId, currency, since);
    const { totals } = report;
    const inventoryTotals = {
      cardCount: totals.cardCount,
      marketValue: totals.totalValue,
      costBasis: totals.costBasis ?? 0,
      costedCards: totals.costedCount ?? 0,
      costedMarketValue: totals.costedValue ?? 0,
    };
    if (isInventorySnapshotDue(orgId, inventoryTotals, currency)) {
      void writeInventorySnapshot(orgId, inventoryTotals, currency).catch((err) =>
        console.error("[stats] snapshot:", err),
      );
    }
    return c.json({ success: true, data: { ...report, valueHistory } });
  },
);

export { router as statsRouter };
