import {
  SCAN_REMOVAL_COPIES_LIMIT,
  SCAN_REMOVAL_MAX_CANDIDATES,
} from "@magic-vault/shared";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { findCardsCollection, loadCardCopies } from "./cards-query";

export const collectionCardCopiesRoute = new Hono<AppEnv>().get(
  "/:guid/cards/copies",
  requireAuth,
  requireOrg,
  async (c) => {
    const cardIds = [
      ...new Set(
        (c.req.query("cardIds") ?? "")
          .split(",")
          .map((cardId) => cardId.trim())
          .filter(Boolean),
      ),
    ].slice(0, SCAN_REMOVAL_MAX_CANDIDATES);
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      const collection = await findCardsCollection(
        tx,
        c.req.param("guid"),
        c.get("orgId"),
      );
      if (!collection)
        return { success: false, message: "Collection not found." };
      const data = await loadCardCopies(
        tx,
        collection,
        cardIds,
        SCAN_REMOVAL_COPIES_LIMIT,
      );
      return { success: true, data };
    });
    return c.json(result);
  },
);
