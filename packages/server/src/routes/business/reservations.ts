import {
  CARD_RESERVATION_LIST_VIEW_PARAM,
  CARD_RESERVATION_LIST_VIEWS,
  CARD_RESERVATIONS_CHANGED_EVENT,
  ORDERS_CHANGED_EVENT,
  cardReservationPickRequestSchema,
  type CardReservationListView,
  type CollectedCardReservations,
  type ReleasedCardReservations,
} from "@magic-vault/shared";
import { Hono, type Context } from "hono";
import {
  createCardReservationPick,
  collectCardReservations,
  listOwnerCardReservations,
  releaseCardReservations,
} from "../../lib/card-reservations";
import {
  BUSINESS_FORBIDDEN_RESULT,
  BUSINESS_UPGRADE_REQUIRED_RESULT,
} from "../../lib/constants/business";
import {
  CARD_RESERVATION_CARD_GONE_MESSAGE,
  CARD_RESERVATION_INVALID_VIEW_MESSAGE,
  CARD_RESERVATION_NOT_FOUND_MESSAGE,
  CARD_RESERVATION_NOT_HOLDER_MESSAGE,
  CARD_RESERVATION_NOTHING_TO_PULL_MESSAGE,
  CARD_RESERVATION_PICK_INVALID_MESSAGE,
} from "../../lib/constants/card-reservations";
import type {
  CardReservationSelection,
  CollectCardReservationsResult,
} from "../../lib/interfaces/card-reservations";
import { deleteScanImages } from "../../lib/scan-images";
import { emitToOrg, emitToSession } from "../../lib/session-stream";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { isUuid } from "../collections/cards-query";
import { businessQuery, notFound } from "./shared";

function isListView(value: string): value is CardReservationListView {
  return (CARD_RESERVATION_LIST_VIEWS as readonly string[]).includes(value);
}

function reservationSelection(c: Context<AppEnv>): CardReservationSelection | null {
  const reservationGuid = c.req.param("guid");
  if (reservationGuid) return isUuid(reservationGuid) ? { kind: "reservation", reservationGuid } : null;
  const requestGuid = c.req.param("requestGuid");
  return requestGuid && isUuid(requestGuid) ? { kind: "request", requestGuid } : null;
}

async function releaseSelected(c: Context<AppEnv>) {
  const orgId = c.get("orgId");
  const selection = reservationSelection(c);
  let releasedCount = 0;
  const response = await businessQuery(c, async (tx, access) => {
    if (!access.canFulfilOrders) return BUSINESS_FORBIDDEN_RESULT;
    releasedCount = selection
      ? await releaseCardReservations(tx, { orgId, userId: c.get("userId"), selection })
      : 0;
    const data: ReleasedCardReservations = { releasedCount };
    return releasedCount > 0 ? { success: true, data } : notFound(CARD_RESERVATION_NOT_FOUND_MESSAGE);
  });
  if (releasedCount > 0 && response.status === 200) {
    emitToOrg(orgId, CARD_RESERVATIONS_CHANGED_EVENT, { createdReservation: null });
  }
  return response;
}

async function collectSelected(c: Context<AppEnv>) {
  const orgId = c.get("orgId");
  const selection = reservationSelection(c);
  const outcome: { collected: Extract<CollectCardReservationsResult, { status: "collected" }> | null } = {
    collected: null,
  };
  const response = await businessQuery(c, async (tx, access) => {
    if (!access.canFulfilOrders) return BUSINESS_FORBIDDEN_RESULT;
    if (!selection) return notFound(CARD_RESERVATION_NOT_FOUND_MESSAGE);
    const result = await collectCardReservations(tx, { orgId, userId: c.get("userId"), selection });
    switch (result.status) {
      case "not-found":
        return notFound(CARD_RESERVATION_NOT_FOUND_MESSAGE);
      case "not-holder":
        return { success: false, message: CARD_RESERVATION_NOT_HOLDER_MESSAGE };
      case "card-gone":
        return { success: false, message: CARD_RESERVATION_CARD_GONE_MESSAGE };
      case "collected": {
        outcome.collected = result;
        const data: CollectedCardReservations = result.collected;
        return { success: true, data };
      }
    }
  });
  const { collected } = outcome;
  if (!collected || response.status !== 200) return response;
  deleteScanImages(collected.imageKeys);
  const scanIdsByCollection = new Map<string, string[]>();
  for (const card of collected.removedCards) {
    const scanIds = scanIdsByCollection.get(card.collectionGuid) ?? [];
    scanIds.push(card.scanId);
    scanIdsByCollection.set(card.collectionGuid, scanIds);
  }
  for (const [collectionGuid, scanIds] of scanIdsByCollection) {
    emitToSession(orgId, collectionGuid, "cards_removed", { scanIds });
    emitToOrg(orgId, "collections_changed", { guid: collectionGuid });
  }
  emitToOrg(orgId, CARD_RESERVATIONS_CHANGED_EVENT, { createdReservation: null });
  return response;
}

export const reservationsRoute = new Hono<AppEnv>()
  .get("/reservations", requireAuth, requireOrg, (c) => {
    const view = c.req.query(CARD_RESERVATION_LIST_VIEW_PARAM) ?? CARD_RESERVATION_LIST_VIEWS[0];
    if (!isListView(view)) {
      return c.json({ success: false, message: CARD_RESERVATION_INVALID_VIEW_MESSAGE }, 400);
    }
    return businessQuery(c, async (tx, access) => {
      if (!access.canFulfilOrders) return BUSINESS_FORBIDDEN_RESULT;
      return { success: true, data: await listOwnerCardReservations(tx, c.get("orgId"), view) };
    });
  })
  .post("/reservations/requests/:requestGuid/pick", requireAuth, requireOrg, async (c) => {
    const requestGuid = c.req.param("requestGuid");
    const parsed = cardReservationPickRequestSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success || !isUuid(requestGuid)) {
      return c.json({ success: false, message: CARD_RESERVATION_PICK_INVALID_MESSAGE }, 400);
    }
    const orgId = c.get("orgId");
    let createdPick = false;
    const response = await businessQuery(c, async (tx, access) => {
      if (access.isLocked) return BUSINESS_UPGRADE_REQUIRED_RESULT;
      if (!access.canFulfilOrders) return BUSINESS_FORBIDDEN_RESULT;
      const data = await createCardReservationPick(tx, {
        orgId,
        userId: c.get("userId"),
        requestGuid,
        name: parsed.data.name,
      });
      if (!data) return { success: false, message: CARD_RESERVATION_NOTHING_TO_PULL_MESSAGE };
      createdPick = true;
      return { success: true, data };
    });
    if (createdPick && response.status === 200) {
      emitToOrg(orgId, ORDERS_CHANGED_EVENT, {});
      emitToOrg(orgId, CARD_RESERVATIONS_CHANGED_EVENT, { createdReservation: null });
    }
    return response;
  })
  .post("/reservations/requests/:requestGuid/release", requireAuth, requireOrg, releaseSelected)
  .post("/reservations/requests/:requestGuid/collect", requireAuth, requireOrg, collectSelected)
  .post("/reservations/:guid/release", requireAuth, requireOrg, releaseSelected)
  .post("/reservations/:guid/collect", requireAuth, requireOrg, collectSelected);
