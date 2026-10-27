import { Hono } from "hono";
import { authQuery } from "../../db";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import {
  findCardsCollection,
  loadAllCards,
  loadStoredCardCount,
  parseScanIds,
} from "./cards-query";

export const exportCollectionCardsRoute = new Hono<AppEnv>()
  .get("/:guid/cards/export", requireAuth, requireOrg, async (c) => {
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      const collection = await findCardsCollection(
        tx,
        c.req.param("guid"),
        c.get("orgId"),
      );
      if (!collection)
        return { success: false, message: "Collection not found." };

      return { success: true, data: await loadAllCards(tx, collection) };
    });
    return c.json(result);
  })
  .post("/:guid/cards/export", requireAuth, requireOrg, async (c) => {
    const scanIds = parseScanIds(await c.req.json().catch(() => ({})));
    if (!scanIds) {
      return c.json({ success: false, message: "Invalid card ids." }, 400);
    }
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      const collection = await findCardsCollection(
        tx,
        c.req.param("guid"),
        c.get("orgId"),
      );
      if (!collection)
        return { success: false, message: "Collection not found." };

      return {
        success: true,
        data: await loadAllCards(tx, collection, scanIds),
      };
    });
    return c.json(result);
  })
  .post("/:guid/cards/stored-count", requireAuth, requireOrg, async (c) => {
    const scanIds = parseScanIds(await c.req.json().catch(() => ({})));
    if (!scanIds) {
      return c.json({ success: false, message: "Invalid card ids." }, 400);
    }
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      const collection = await findCardsCollection(
        tx,
        c.req.param("guid"),
        c.get("orgId"),
      );
      if (!collection)
        return { success: false, message: "Collection not found." };

      return {
        success: true,
        data: {
          storedCount: await loadStoredCardCount(tx, collection.id, scanIds),
        },
      };
    });
    return c.json(result);
  });
