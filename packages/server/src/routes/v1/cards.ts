import { Hono } from "hono";
import { apiKeyQuery } from "../../db";
import { UUID_PATTERN } from "../../lib/constants/validation";
import type { ApiKeyEnv } from "../../lib/interfaces/api-keys";
import type { PublicApiCardCursor } from "../../lib/interfaces/public-api";
import {
  loadPublicApiCard,
  loadPublicApiCards,
} from "../../lib/public-api/cards";
import {
  decodeCursor,
  parseBooleanParam,
  parseCardIds,
  parseGuidParam,
  parsePageLimit,
  parseSince,
  parseTextParam,
} from "../../lib/public-api/pagination";
import { requireApiKey } from "../../middleware/api-key";
import { publicApiError } from "./shared";

export const publicCardsRoute = new Hono<ApiKeyEnv>()
  .get("/cards", requireApiKey, async (c) => {
    const orgId = c.get("orgId");
    try {
      const filters = {
        since: parseSince(c.req.query("since")),
        cursor: decodeCursor<PublicApiCardCursor>(
          c.req.query("cursor"),
          (cursor) =>
            Number.isInteger(cursor.i) &&
            (cursor.t === undefined || typeof cursor.t === "string"),
        ),
        limit: parsePageLimit(c.req.query("limit")),
        collectionGuid: parseGuidParam("collection", c.req.query("collection")),
        locationGuid: parseGuidParam("location", c.req.query("location")),
        inStorage: parseBooleanParam("inStorage", c.req.query("inStorage")),
        cardIds: parseCardIds(c.req.query("cardId")),
        name: parseTextParam(c.req.query("name")),
        set: parseTextParam(c.req.query("set")),
        number: parseTextParam(c.req.query("number")),
        foil: parseBooleanParam("foil", c.req.query("foil")),
      };
      const data = await apiKeyQuery(orgId, (tx) =>
        loadPublicApiCards(tx, orgId, filters),
      );
      return c.json({ success: true, data });
    } catch (err) {
      return publicApiError(c, err);
    }
  })
  .get("/cards/:scanId", requireApiKey, async (c) => {
    const orgId = c.get("orgId");
    const scanId = c.req.param("scanId");
    if (!UUID_PATTERN.test(scanId)) {
      return c.json({ success: false, message: "Card not found." }, 404);
    }
    try {
      const data = await apiKeyQuery(orgId, (tx) =>
        loadPublicApiCard(tx, orgId, scanId),
      );
      return data
        ? c.json({ success: true, data })
        : c.json({ success: false, message: "Card not found." }, 404);
    } catch (err) {
      return publicApiError(c, err);
    }
  });
