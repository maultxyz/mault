import type { ApiScannedCardList } from "@magic-vault/shared";
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
  parseFinish,
  parseGuidParam,
  parsePageLimit,
  parseSince,
  parseTextParam,
} from "../../lib/public-api/pagination";
import {
  apiError,
  apiErrorFrom,
  toApiList,
} from "../../lib/public-api/responses";
import { requireApiKey } from "../../middleware/api-key";

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
        inStorage: parseBooleanParam("in_storage", c.req.query("in_storage")),
        cardIds: parseCardIds(c.req.query("card_id")),
        name: parseTextParam(c.req.query("name")),
        set: parseTextParam(c.req.query("set")),
        collectorNumber: parseTextParam(c.req.query("collector_number")),
        foil: parseFinish(c.req.query("finish")),
      };
      const page = await apiKeyQuery(orgId, (tx) =>
        loadPublicApiCards(tx, orgId, filters),
      );
      const body: ApiScannedCardList = {
        ...toApiList(c, page),
        next_since: page.nextSince,
      };
      return c.json(body);
    } catch (err) {
      return apiErrorFrom(c, err);
    }
  })
  .get("/cards/:id", requireApiKey, async (c) => {
    const orgId = c.get("orgId");
    const scanId = c.req.param("id");
    if (!UUID_PATTERN.test(scanId)) {
      return apiError(c, 404, "not_found", "No card found with that id.");
    }
    try {
      const card = await apiKeyQuery(orgId, (tx) =>
        loadPublicApiCard(tx, orgId, scanId),
      );
      return card
        ? c.json(card)
        : apiError(c, 404, "not_found", "No card found with that id.");
    } catch (err) {
      return apiErrorFrom(c, err);
    }
  });
