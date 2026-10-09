import { Hono } from "hono";
import { apiKeyQuery } from "../../db";
import type { ApiKeyEnv } from "../../lib/interfaces/api-keys";
import {
  loadPublicApiCollections,
  loadPublicApiLocations,
} from "../../lib/public-api/catalog";
import { requireApiKey } from "../../middleware/api-key";
import { publicApiError } from "./shared";

export const publicCatalogRoute = new Hono<ApiKeyEnv>()
  .get("/collections", requireApiKey, async (c) => {
    const orgId = c.get("orgId");
    try {
      const data = await apiKeyQuery(orgId, (tx) =>
        loadPublicApiCollections(tx, orgId),
      );
      return c.json({ success: true, data });
    } catch (err) {
      return publicApiError(c, err);
    }
  })
  .get("/locations", requireApiKey, async (c) => {
    const orgId = c.get("orgId");
    try {
      const data = await apiKeyQuery(orgId, (tx) =>
        loadPublicApiLocations(tx, orgId),
      );
      return c.json({ success: true, data });
    } catch (err) {
      return publicApiError(c, err);
    }
  });
