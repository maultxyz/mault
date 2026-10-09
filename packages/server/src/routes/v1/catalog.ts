import { Hono } from "hono";
import { apiKeyQuery } from "../../db";
import { UUID_PATTERN } from "../../lib/constants/validation";
import type { ApiKeyEnv } from "../../lib/interfaces/api-keys";
import type { PublicApiLocationCursor } from "../../lib/interfaces/public-api";
import { loadPublicApiLocationCards } from "../../lib/public-api/cards";
import {
  loadPublicApiCollections,
  loadPublicApiLocations,
} from "../../lib/public-api/catalog";
import {
  decodeCursor,
  parsePageLimit,
} from "../../lib/public-api/pagination";
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
  })
  .get("/locations/:guid/cards", requireApiKey, async (c) => {
    const orgId = c.get("orgId");
    const guid = c.req.param("guid");
    if (!UUID_PATTERN.test(guid)) {
      return c.json(
        { success: false, message: "Storage location not found." },
        404,
      );
    }
    try {
      const filters = {
        cursor: decodeCursor<PublicApiLocationCursor>(
          c.req.query("cursor"),
          (cursor) => Number.isInteger(cursor.p) && Number.isInteger(cursor.i),
        ),
        limit: parsePageLimit(c.req.query("limit")),
      };
      const data = await apiKeyQuery(orgId, (tx) =>
        loadPublicApiLocationCards(tx, orgId, guid, filters),
      );
      return data
        ? c.json({ success: true, data })
        : c.json(
            { success: false, message: "Storage location not found." },
            404,
          );
    } catch (err) {
      return publicApiError(c, err);
    }
  });
