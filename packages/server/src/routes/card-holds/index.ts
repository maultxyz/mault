import { CARD_HOLDS_CHANGED_EVENT } from "@magic-vault/shared";
import { Hono } from "hono";
import { authQuery } from "../../db";
import {
  approveOwnerCardHold,
  listOwnerCardHolds,
  releaseOwnerCardHold,
} from "../../lib/card-holds";
import { CARD_HOLD_RELEASE_NOT_FOUND_MESSAGE } from "../../lib/constants/auth";
import { emitToOrg } from "../../lib/session-stream";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";

export const cardHoldsRouter = new Hono<AppEnv>()
  .get("/", requireAuth, requireOrg, async (c) => {
    const collectionGuid = c.req.query("collection");
    const locationGuid = c.req.query("location");
    if (!collectionGuid && !locationGuid) {
      return c.json(
        { success: false, message: "Pass a collection or location." },
        400,
      );
    }
    const data = await authQuery(c.get("jwtClaims"), (tx) =>
      listOwnerCardHolds(tx, c.get("orgId"), { collectionGuid, locationGuid }),
    );
    return c.json({ success: true, data });
  })
  .post("/:guid/approve", requireAuth, requireOrg, async (c) => {
    const orgId = c.get("orgId");
    const changed = await authQuery(c.get("jwtClaims"), (tx) =>
      approveOwnerCardHold(tx, orgId, c.req.param("guid")),
    );
    if (!changed) {
      return c.json({ success: false, message: CARD_HOLD_RELEASE_NOT_FOUND_MESSAGE }, 404);
    }
    emitToOrg(orgId, CARD_HOLDS_CHANGED_EVENT, changed);
    return c.json({ success: true, message: "Hold approved." });
  })
  .delete("/:guid", requireAuth, requireOrg, async (c) => {
    const orgId = c.get("orgId");
    const changed = await authQuery(c.get("jwtClaims"), (tx) =>
      releaseOwnerCardHold(tx, orgId, c.req.param("guid")),
    );
    if (!changed) {
      return c.json({ success: false, message: CARD_HOLD_RELEASE_NOT_FOUND_MESSAGE }, 404);
    }
    emitToOrg(orgId, CARD_HOLDS_CHANGED_EVENT, changed);
    return c.json({ success: true, message: "Hold released." });
  });
