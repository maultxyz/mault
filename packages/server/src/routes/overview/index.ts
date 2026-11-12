import { Hono } from "hono";
import { authQuery } from "../../db";
import {
  isCollectionValueSnapshotDue,
  writeCollectionValueSnapshots,
} from "../../lib/collection-value-snapshots";
import { loadOrgOverview } from "../../lib/org-overview";
import { loadWidgetSummary } from "../../lib/widget-summary";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";

const router = new Hono<AppEnv>()
  .get("/", requireAuth, requireOrg, async (c) => {
    const data = await authQuery(c.get("jwtClaims"), (tx) =>
      loadOrgOverview(tx, c.get("orgId")),
    );
    return c.json({ success: true, data });
  })
  .get("/widgets", requireAuth, requireOrg, async (c) => {
    const orgId = c.get("orgId");
    const { summary, currency, collectionValues } = await authQuery(
      c.get("jwtClaims"),
      (tx) => loadWidgetSummary(tx, orgId),
    );
    if (isCollectionValueSnapshotDue(orgId)) {
      void writeCollectionValueSnapshots(orgId, currency, collectionValues).catch(
        (err) => console.error("[overview] collection value snapshot:", err),
      );
    }
    return c.json({ success: true, data: summary });
  });

export { router as overviewRouter };
