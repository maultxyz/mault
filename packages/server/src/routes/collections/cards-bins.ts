import type { BinWindow } from "@magic-vault/shared";
import { Hono, type Context } from "hono";
import { authQuery, type Transaction } from "../../db";
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
    collectionId: number,
    bins: BinWindow[],
  ) => Promise<T>,
) {
  return async (c: Context<AppEnv>) => {
    const bins = parseBinWindows(c.req.query("bins"));
    try {
      const result = await authQuery(c.get("jwtClaims"), async (tx) => {
        const collection = await findCardsCollection(
          tx,
          c.req.param("guid")!,
          c.get("orgId"),
        );
        if (!collection)
          return { success: false, message: "Collection not found." };
        return { success: true, data: await load(tx, collection.id, bins) };
      });
      return c.json(result);
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  };
}

export const collectionCardBinsRoute = new Hono<AppEnv>()
  .get(
    "/:guid/cards/bin-counts",
    requireAuth,
    requireOrg,
    binsHandler(loadBinCounts),
  )
  .get(
    "/:guid/cards/bin-contents",
    requireAuth,
    requireOrg,
    binsHandler(loadBinContents),
  );
