import { Hono } from "hono";
import {
  isCollectionValueSnapshotDue,
  writeCollectionValueSnapshots,
} from "../../lib/collection-value-snapshots";
import { loadCachedOrgOverview } from "../../lib/org-overview";
import { loadCachedWidgetSummary } from "../../lib/widget-summary";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";

const router = new Hono<AppEnv>()
  .get("/", requireAuth, requireOrg, async (c) => {
    const data = await loadCachedOrgOverview(c.get("jwtClaims"), c.get("orgId"));
    return c.json({ success: true, data });
  })
  .get("/widgets", requireAuth, requireOrg, async (c) => {
    const orgId = c.get("orgId");
    const { summary, currency, collectionValues } = await loadCachedWidgetSummary(
      c.get("jwtClaims"),
      orgId,
      { includeCollectionSummaries: c.req.query("includeCollectionSummaries") !== "false" },
    );
    if (isCollectionValueSnapshotDue(orgId)) {
      void writeCollectionValueSnapshots(orgId, currency, collectionValues).catch(
        (err) => console.error("[overview] collection value snapshot:", err),
      );
    }
    return c.json({ success: true, data: summary });
  });

export { router as overviewRouter };
