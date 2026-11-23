import {
  CARD_RESERVATIONS_CHANGED_EVENT,
  SHARE_LINK_GUEST_KEY_HEADER,
  seenCardReservationAlertsRequestSchema,
  type ClaimMyCardReservationsResult,
} from "@magic-vault/shared";
import { Hono, type Context } from "hono";
import { db } from "../../db";
import { cancelMyCardReservations } from "../../lib/card-reservations";
import type { CardReservationSelection } from "../../lib/interfaces/card-reservations";
import {
  CARD_RESERVATION_ALERTS_INVALID_MESSAGE,
  CARD_RESERVATION_CLAIM_RATE_LIMITED_MESSAGE,
  CARD_RESERVATION_CLAIM_RATE_LIMIT_REQUESTS,
  CARD_RESERVATION_CLAIM_RATE_LIMIT_SWEEP_SIZE,
  CARD_RESERVATION_CLAIM_RATE_LIMIT_WINDOW_MS,
  CARD_RESERVATION_GUEST_KEY_MESSAGE,
  CARD_RESERVATION_NOT_FOUND_MESSAGE,
} from "../../lib/constants/card-reservations";
import { guestKeyHashFromHeader } from "../../lib/guest-keys";
import { refreshCustomerOrgsInBackground } from "../../lib/customer-stream";
import {
  claimMyCardReservations,
  listMyCardReservations,
  markMyCardReservationAlertsSeen,
} from "../../lib/my-card-reservations";
import { createRateLimiter } from "../../lib/public-api/rate-limit";
import { emitToOrg } from "../../lib/session-stream";
import { rejectWhileImpersonating, requireAuth, type AppEnv } from "../../middleware/auth";
import { isUuid } from "../collections/cards-query";

const consumeClaimRateLimit = createRateLimiter({
  requests: CARD_RESERVATION_CLAIM_RATE_LIMIT_REQUESTS,
  windowMs: CARD_RESERVATION_CLAIM_RATE_LIMIT_WINDOW_MS,
  sweepSize: CARD_RESERVATION_CLAIM_RATE_LIMIT_SWEEP_SIZE,
});

async function cancelMine(c: Context<AppEnv>, selection: CardReservationSelection | null) {
  const orgId = selection
    ? await db.transaction((tx) => cancelMyCardReservations(tx, c.get("userId"), selection))
    : null;
  if (!orgId) {
    return c.json({ success: false, message: CARD_RESERVATION_NOT_FOUND_MESSAGE }, 404);
  }
  emitToOrg(orgId, CARD_RESERVATIONS_CHANGED_EVENT, { createdReservation: null });
  return c.json({ success: true, data: null });
}

export const cardReservationsRouter = new Hono<AppEnv>()
  .get("/mine", requireAuth, async (c) => {
    const data = await db.transaction((tx) => listMyCardReservations(tx, c.get("userId")));
    return c.json({ success: true, data });
  })
  .post("/mine/claim", requireAuth, rejectWhileImpersonating, async (c) => {
    const rate = consumeClaimRateLimit(c.get("userId"));
    if (!rate.allowed) {
      c.header("Retry-After", String(Math.max(Math.ceil((rate.resetAt - Date.now()) / 1000), 0)));
      return c.json({ success: false, message: CARD_RESERVATION_CLAIM_RATE_LIMITED_MESSAGE }, 429);
    }
    const guestKeyHash = guestKeyHashFromHeader(c.req.header(SHARE_LINK_GUEST_KEY_HEADER));
    if (!guestKeyHash) {
      return c.json({ success: false, message: CARD_RESERVATION_GUEST_KEY_MESSAGE }, 400);
    }
    const claimedCount = await db.transaction((tx) =>
      claimMyCardReservations(tx, { guestUserId: c.get("userId"), guestKeyHash }),
    );
    if (claimedCount > 0) refreshCustomerOrgsInBackground(c.get("userId"));
    const data: ClaimMyCardReservationsResult = { claimedCount };
    return c.json({ success: true, data });
  })
  .post("/mine/alerts/seen", requireAuth, rejectWhileImpersonating, async (c) => {
    const parsed = seenCardReservationAlertsRequestSchema.safeParse(
      await c.req.json().catch(() => null),
    );
    if (!parsed.success) {
      return c.json({ success: false, message: CARD_RESERVATION_ALERTS_INVALID_MESSAGE }, 400);
    }
    await db.transaction((tx) =>
      markMyCardReservationAlertsSeen(tx, c.get("userId"), parsed.data.guids),
    );
    return c.json({ success: true, data: null });
  })
  .delete("/mine/requests/:requestGuid", requireAuth, rejectWhileImpersonating, (c) => {
    const requestGuid = c.req.param("requestGuid");
    return cancelMine(c, isUuid(requestGuid) ? { kind: "request", requestGuid } : null);
  })
  .delete("/mine/:guid", requireAuth, rejectWhileImpersonating, (c) => {
    const reservationGuid = c.req.param("guid");
    return cancelMine(c, isUuid(reservationGuid) ? { kind: "reservation", reservationGuid } : null);
  });
