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
import {
  apiError,
  apiErrorFrom,
  toApiList,
  toCompleteApiList,
} from "../../lib/public-api/responses";
import { requireApiKey } from "../../middleware/api-key";

export const publicCatalogRoute = new Hono<ApiKeyEnv>()
  .get("/collections", requireApiKey, async (c) => {
    const orgId = c.get("orgId");
    try {
      const collections = await apiKeyQuery(orgId, (tx) =>
        loadPublicApiCollections(tx, orgId),
      );
      return c.json(toCompleteApiList(collections));
    } catch (err) {
      return apiErrorFrom(c, err);
    }
  })
  .get("/locations", requireApiKey, async (c) => {
    const orgId = c.get("orgId");
    try {
      const locations = await apiKeyQuery(orgId, (tx) =>
        loadPublicApiLocations(tx, orgId),
      );
      return c.json(toCompleteApiList(locations));
    } catch (err) {
      return apiErrorFrom(c, err);
    }
  })
  .get("/locations/:id/cards", requireApiKey, async (c) => {
    const orgId = c.get("orgId");
    const locationId = c.req.param("id");
    if (!UUID_PATTERN.test(locationId)) {
      return apiError(c, 404, "not_found", "No location found with that id.");
    }
    try {
      const filters = {
        cursor: decodeCursor<PublicApiLocationCursor>(
          c.req.query("cursor"),
          (cursor) => Number.isInteger(cursor.p) && Number.isInteger(cursor.i),
        ),
        limit: parsePageLimit(c.req.query("limit")),
      };
      const page = await apiKeyQuery(orgId, (tx) =>
        loadPublicApiLocationCards(tx, orgId, locationId, filters),
      );
      return page
        ? c.json(toApiList(c, page))
        : apiError(c, 404, "not_found", "No location found with that id.");
    } catch (err) {
      return apiErrorFrom(c, err);
    }
  });
