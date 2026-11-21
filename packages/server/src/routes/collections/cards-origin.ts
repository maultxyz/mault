import { Hono } from "hono";
import { authQuery } from "../../db";
import {
  loadCardScanOriginRow,
  toCardScanOrigin,
} from "../../lib/collection-card-details";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { isUuid } from "./cards-query";

export const collectionCardOriginRoute = new Hono<AppEnv>().get(
  "/:guid/cards/:scanId/origin",
  requireAuth,
  requireOrg,
  async (c) => {
    const scanId = c.req.param("scanId");
    if (!isUuid(scanId)) return c.json({ success: true, data: null });
    const row = await authQuery(c.get("jwtClaims"), (tx) =>
      loadCardScanOriginRow(tx, c.get("orgId"), scanId),
    );
    return c.json({ success: true, data: await toCardScanOrigin(row) });
  },
);
