import { collectionCsvExportRequestSchema } from "@magic-vault/shared";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { buildCardExport, csvResponse } from "../../lib/card-export";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import {
  findCardsCollection,
  loadAllCards,
  loadStoredCardCount,
  parseScanIds,
} from "./cards-query";

export const exportCollectionCardsRoute = new Hono<AppEnv>()
  .post("/:guid/cards/csv-export", requireAuth, requireOrg, async (c) => {
    const input = collectionCsvExportRequestSchema.safeParse(
      await c.req.json().catch(() => ({})),
    );
    if (!input.success) {
      return c.json({ success: false, message: "Invalid export request." }, 400);
    }
    const loaded = await authQuery(c.get("jwtClaims"), async (tx) => {
      const collection = await findCardsCollection(
        tx,
        c.req.param("guid"),
        c.get("orgId"),
      );
      if (!collection) return null;
      return {
        collection,
        cards: await loadAllCards(tx, collection, input.data.scanIds),
      };
    });
    if (!loaded) {
      return c.json({ success: false, message: "Collection not found." }, 404);
    }
    const { collection, cards } = loaded;
    const result = await buildCardExport({
      format: input.data.format,
      combineDuplicates: input.data.combineDuplicates,
      cards,
      gameKeys: [collection.gameKey],
      game: collection.gameKey
        ? {
            key: collection.gameKey,
            name: collection.gameName ?? collection.gameKey,
            fieldDefinitions: collection.fieldDefinitions,
          }
        : null,
      exportName: collection.name,
    });
    if (!result.success) return c.json(result, 400);
    return csvResponse(c, result.csv, result.filename);
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
