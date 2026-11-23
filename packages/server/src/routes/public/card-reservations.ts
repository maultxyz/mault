import {
  CARD_RESERVATIONS_CHANGED_EVENT,
  SHARE_LINK_GUEST_KEY_HEADER,
  cardReservationRequestSchema,
} from "@magic-vault/shared";
import { Hono, type Context } from "hono";
import { db } from "../../db";
import {
  cancelGuestCardReservation,
  createCardReservations,
  listPublicCardReservations,
} from "../../lib/card-reservations";
import { MONITOR_LINK_INVALID_MESSAGE } from "../../lib/constants/auth";
import {
  CARD_RESERVATION_ALREADY_RESERVED_MESSAGE,
  CARD_RESERVATION_CARD_NOT_FOUND_MESSAGE,
  CARD_RESERVATION_GUEST_KEY_MESSAGE,
  CARD_RESERVATION_GUEST_LIMIT_MESSAGE,
  CARD_RESERVATION_INVALID_MESSAGE,
  CARD_RESERVATION_NOT_FOUND_MESSAGE,
  CARD_RESERVATION_ACCOUNT_REQUIRED_MESSAGE,
  CARD_RESERVATION_OWN_ORG_MESSAGE,
  CARD_RESERVATION_QUEUE_FULL_MESSAGE,
  CARD_RESERVATIONS_NOT_ALLOWED_MESSAGE,
} from "../../lib/constants/card-reservations";
import { sendCardReservationCreatedDiscordNotification } from "../../lib/discord/card-reservation";
import { guestKeyHashFromHeader } from "../../lib/guest-keys";
import type { CardReservationSelection } from "../../lib/interfaces/card-reservations";
import type { ShopCatalogClaims } from "../../lib/interfaces/share-tokens";
import { emitToOrg } from "../../lib/session-stream";
import { shopCatalogScope } from "../../lib/share-link-scopes";
import { optionalVerifiedUserId } from "../../lib/optional-auth";
import { watchCustomerOrgInBackground } from "../../lib/customer-stream";
import { sendCreatedReservationStatusMessageInBackground } from "../../lib/customer-status-messages";
import {
  findOrgMembership,
  verifyHardwareClientToken,
  type AppEnv,
} from "../../middleware/auth";
import { isUuid } from "../collections/cards-query";

async function cancelForGuest(
  c: Context<AppEnv>,
  catalog: ShopCatalogClaims,
  selection: CardReservationSelection | null,
) {
  const guestKeyHash = guestKeyHashFromHeader(c.req.header(SHARE_LINK_GUEST_KEY_HEADER));
  const cancelled =
    !!guestKeyHash &&
    !!selection &&
    (await db.transaction((tx) =>
      cancelGuestCardReservation(tx, { orgId: catalog.orgId, selection, guestKeyHash }),
    ));
  if (!cancelled) {
    return c.json({ success: false, message: CARD_RESERVATION_NOT_FOUND_MESSAGE }, 404);
  }
  emitToOrg(catalog.orgId, CARD_RESERVATIONS_CHANGED_EVENT, { createdReservation: null });
  return c.json({ success: true, data: null });
}

export function createPublicCardReservationsRoute(
  resolveCatalog: (c: Context<AppEnv>) => Promise<ShopCatalogClaims | null>,
) {
  const invalidLink = (c: Context<AppEnv>) =>
    c.json({ success: false, message: MONITOR_LINK_INVALID_MESSAGE }, 401);

  return new Hono<AppEnv>()
    .get("/reservations", async (c) => {
      const catalog = await resolveCatalog(c);
      if (!catalog) return invalidLink(c);
      const guestKeyHash = guestKeyHashFromHeader(c.req.header(SHARE_LINK_GUEST_KEY_HEADER));
      const data = await db.transaction((tx) =>
        listPublicCardReservations(tx, catalog, guestKeyHash),
      );
      return c.json({ success: true, data });
    })
    .post("/reservations", async (c) => {
      const catalog = await resolveCatalog(c);
      if (!catalog) return invalidLink(c);
      if (!catalog.allowsReservations) {
        return c.json({ success: false, message: CARD_RESERVATIONS_NOT_ALLOWED_MESSAGE }, 403);
      }
      const guestKeyHash = guestKeyHashFromHeader(c.req.header(SHARE_LINK_GUEST_KEY_HEADER));
      if (!guestKeyHash) {
        return c.json({ success: false, message: CARD_RESERVATION_GUEST_KEY_MESSAGE }, 400);
      }
      const parsed = cardReservationRequestSchema.safeParse(await c.req.json().catch(() => null));
      if (!parsed.success) {
        return c.json({ success: false, message: CARD_RESERVATION_INVALID_MESSAGE }, 400);
      }
      const guestUserId = await optionalVerifiedUserId(
        c.req.header("Authorization"),
        verifyHardwareClientToken,
      );
      if (catalog.reservationsRequireAccount && !guestUserId) {
        return c.json({ success: false, message: CARD_RESERVATION_ACCOUNT_REQUIRED_MESSAGE }, 401);
      }
      if (guestUserId && (await findOrgMembership(guestUserId, catalog.orgId))) {
        return c.json({ success: false, message: CARD_RESERVATION_OWN_ORG_MESSAGE }, 409);
      }
      const result = await db.transaction((tx) =>
        createCardReservations(tx, {
          catalog,
          scope: shopCatalogScope(catalog),
          request: parsed.data,
          guestKeyHash,
          guestUserId,
        }),
      );
      switch (result.status) {
        case "card-not-found":
          return c.json({ success: false, message: CARD_RESERVATION_CARD_NOT_FOUND_MESSAGE }, 409);
        case "already-reserved":
          return c.json({ success: false, message: CARD_RESERVATION_ALREADY_RESERVED_MESSAGE }, 409);
        case "queue-full":
          return c.json({ success: false, message: CARD_RESERVATION_QUEUE_FULL_MESSAGE }, 409);
        case "guest-limit-reached":
          return c.json({ success: false, message: CARD_RESERVATION_GUEST_LIMIT_MESSAGE }, 429);
        case "created":
          if (guestUserId) {
            watchCustomerOrgInBackground(guestUserId, catalog.orgId);
            sendCreatedReservationStatusMessageInBackground(
              catalog.orgId,
              guestUserId,
              result.requestGuid,
            );
          }
          emitToOrg(catalog.orgId, CARD_RESERVATIONS_CHANGED_EVENT, result.changed);
          if (result.changed.createdReservation) {
            void sendCardReservationCreatedDiscordNotification({
              orgId: catalog.orgId,
              catalogName: catalog.name,
              ...result.changed.createdReservation,
            });
          }
          return c.json({ success: true, data: result.created });
      }
    })
    .delete("/reservations/requests/:requestGuid", async (c) => {
      const catalog = await resolveCatalog(c);
      if (!catalog) return invalidLink(c);
      const requestGuid = c.req.param("requestGuid");
      return cancelForGuest(c, catalog, isUuid(requestGuid) ? { kind: "request", requestGuid } : null);
    })
    .delete("/reservations/:guid", async (c) => {
      const catalog = await resolveCatalog(c);
      if (!catalog) return invalidLink(c);
      const reservationGuid = c.req.param("guid");
      return cancelForGuest(
        c,
        catalog,
        isUuid(reservationGuid) ? { kind: "reservation", reservationGuid } : null,
      );
    });
}
