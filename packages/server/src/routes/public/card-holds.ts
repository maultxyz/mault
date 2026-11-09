import {
  CARD_HOLD_GUEST_KEY_HEADER,
  CARD_HOLDS_CHANGED_EVENT,
  cardHoldRequestSchema,
} from "@magic-vault/shared";
import { Hono, type Context } from "hono";
import { z } from "zod";
import { db } from "../../db";
import {
  guestKeyHashFromHeader,
  listPublicCardHolds,
  placeCardHold,
  releaseGuestCardHold,
} from "../../lib/card-holds";
import {
  CARD_HOLD_CONFLICT_MESSAGE,
  CARD_HOLD_GUEST_KEY_MESSAGE,
  CARD_HOLD_GUEST_LIMIT_MESSAGE,
  CARD_HOLD_NOT_FOUND_MESSAGE,
  CARD_HOLD_RELEASE_NOT_FOUND_MESSAGE,
  CARD_HOLDS_DISABLED_MESSAGE,
  MONITOR_LINK_INVALID_MESSAGE,
} from "../../lib/constants/auth";
import type { PublicCardHoldLink } from "../../lib/interfaces/card-holds";
import { emitToOrg } from "../../lib/session-stream";
import type { AppEnv } from "../../middleware/auth";

export function createPublicCardHoldsRoute(
  resolveLink: (c: Context<AppEnv>) => Promise<PublicCardHoldLink | null>,
) {
  return new Hono<AppEnv>()
    .get("/holds", async (c) => {
      const link = await resolveLink(c);
      if (!link) {
        return c.json({ success: false, message: MONITOR_LINK_INVALID_MESSAGE }, 401);
      }
      if (link.holdMinutes === null) return c.json({ success: true, data: [] });
      const guestKeyHash = guestKeyHashFromHeader(
        c.req.header(CARD_HOLD_GUEST_KEY_HEADER),
      );
      const data = await db.transaction((tx) =>
        listPublicCardHolds(tx, link.scope, guestKeyHash),
      );
      return c.json({ success: true, data });
    })
    .post("/holds", async (c) => {
      const link = await resolveLink(c);
      if (!link) {
        return c.json({ success: false, message: MONITOR_LINK_INVALID_MESSAGE }, 401);
      }
      if (link.holdMinutes === null) {
        return c.json({ success: false, message: CARD_HOLDS_DISABLED_MESSAGE }, 403);
      }
      const guestKeyHash = guestKeyHashFromHeader(
        c.req.header(CARD_HOLD_GUEST_KEY_HEADER),
      );
      if (!guestKeyHash) {
        return c.json({ success: false, message: CARD_HOLD_GUEST_KEY_MESSAGE }, 400);
      }
      const parsed = cardHoldRequestSchema.safeParse(
        await c.req.json().catch(() => null),
      );
      if (!parsed.success) {
        return c.json({ success: false, message: "Invalid hold request." }, 400);
      }
      const holdMinutes = link.holdMinutes;
      const result = await db.transaction((tx) =>
        placeCardHold(tx, {
          scope: link.scope,
          scanId: parsed.data.scanId,
          guestName: parsed.data.guestName,
          guestNote: parsed.data.guestNote || null,
          guestKeyHash,
          holdMinutes,
        }),
      );
      switch (result.status) {
        case "card-not-found":
          return c.json({ success: false, message: CARD_HOLD_NOT_FOUND_MESSAGE }, 404);
        case "already-held":
          return c.json({ success: false, message: CARD_HOLD_CONFLICT_MESSAGE }, 409);
        case "guest-limit-reached":
          return c.json({ success: false, message: CARD_HOLD_GUEST_LIMIT_MESSAGE }, 429);
        case "created":
          emitToOrg(link.scope.orgId, CARD_HOLDS_CHANGED_EVENT, result.changed);
          return c.json({ success: true, message: "Card held." });
      }
    })
    .delete("/holds/:scanId", async (c) => {
      const link = await resolveLink(c);
      if (!link) {
        return c.json({ success: false, message: MONITOR_LINK_INVALID_MESSAGE }, 401);
      }
      const guestKeyHash = guestKeyHashFromHeader(
        c.req.header(CARD_HOLD_GUEST_KEY_HEADER),
      );
      const scanId = z.uuid().safeParse(c.req.param("scanId"));
      if (!guestKeyHash || !scanId.success) {
        return c.json({ success: false, message: CARD_HOLD_GUEST_KEY_MESSAGE }, 400);
      }
      const changed = await db.transaction((tx) =>
        releaseGuestCardHold(tx, link.scope, scanId.data, guestKeyHash),
      );
      if (!changed) {
        return c.json(
          { success: false, message: CARD_HOLD_RELEASE_NOT_FOUND_MESSAGE },
          404,
        );
      }
      emitToOrg(link.scope.orgId, CARD_HOLDS_CHANGED_EVENT, changed);
      return c.json({ success: true, message: "Hold released." });
    });
}
