import type { CollectionCardDetails } from "@magic-vault/shared";
import { Hono } from "hono";
import { authQuery } from "../../db";
import {
  loadCollectionCardDetails,
  toCardScanOrigin,
} from "../../lib/collection-card-details";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { isUuid } from "./cards-query";

export const collectionCardDetailsRoute = new Hono<AppEnv>().get(
  "/:guid/cards/:scanId/details",
  requireAuth,
  requireOrg,
  async (c) => {
    const scanId = c.req.param("scanId");
    if (!isUuid(scanId)) return c.json({ success: false, message: "Card not found." });
    const loaded = await authQuery(c.get("jwtClaims"), (tx) =>
      loadCollectionCardDetails(tx, c.get("orgId"), c.get("orgRole"), scanId),
    );
    if (!loaded) return c.json({ success: false, message: "Card not found." });
    const data: CollectionCardDetails = {
      ...loaded.details,
      origin: await toCardScanOrigin(loaded.originRow),
    };
    return c.json({ success: true, data });
  },
);
