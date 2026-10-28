import type { BinWindow } from "@magic-vault/shared";
import { Hono, type Context } from "hono";
import { authQuery, type Transaction } from "../../db";
import type { CardsCollection } from "../../lib/interfaces/collections";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import {
  findCardsCollection,
  loadBinContents,
  loadBinCounts,
  parseBinWindows,
} from "./cards-query";

function binsHandler<T>(
  load: (
    tx: Transaction,
    collection: CardsCollection,
    bins: BinWindow[],
  ) => Promise<T>,
) {
  return async (c: Context<AppEnv>) => {
    const bins = parseBinWindows(c.req.query("bins"));
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      const collection = await findCardsCollection(
        tx,
        c.req.param("guid")!,
        c.get("orgId"),
      );
      if (!collection)
        return { success: false, message: "Collection not found." };
      return { success: true, data: await load(tx, collection, bins) };
    });
    return c.json(result);
  };
}

export const collectionCardBinsRoute = new Hono<AppEnv>()
  .get(
    "/:guid/cards/bin-counts",
    requireAuth,
    requireOrg,
    binsHandler((tx, collection, bins) =>
      loadBinCounts(tx, collection.id, bins),
    ),
  )
  .get(
    "/:guid/cards/bin-contents",
    requireAuth,
    requireOrg,
    binsHandler(loadBinContents),
  );
