import type {
  CardScannedWebhookData,
  CardsStoredWebhookData,
  WebhookEvent,
  WebhookEventType,
  WebhookPayload,
} from "@magic-vault/shared";
import { and, eq, isNull, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { apiKeyQuery, db } from "../../db";
import { webhookEndpoints } from "../../db/schema";
import { isApiAccessAllowed } from "../api-access";
import { WEBHOOK_STORED_CARDS_PER_EVENT } from "../constants/webhooks";
import {
  loadPublicApiCard,
  loadPublicApiCardsByScanIds,
} from "../public-api/cards";
import { enqueueWebhookDelivery, enqueueWebhookJob } from "./queue";

async function loadSubscribedEndpointIds(
  orgId: string,
  event: WebhookEvent,
): Promise<number[]> {
  return db.transaction(async (tx) => {
    const rows = await tx
      .select({ id: webhookEndpoints.id })
      .from(webhookEndpoints)
      .where(
        and(
          eq(webhookEndpoints.orgId, orgId),
          isNull(webhookEndpoints.disabledAt),
          sql`${webhookEndpoints.events} @> ${JSON.stringify([event])}::jsonb`,
        ),
      );
    if (rows.length === 0) return [];
    if (!(await isApiAccessAllowed(tx, orgId))) return [];
    return rows.map((row) => row.id);
  });
}

export function buildWebhookPayload<T>(
  type: WebhookEventType,
  data: T,
): WebhookPayload<T> {
  return {
    id: randomUUID(),
    type,
    createdAt: new Date().toISOString(),
    data,
  };
}

function dispatch<T>(
  endpointIds: number[],
  type: WebhookEvent,
  data: T,
): void {
  const payload = buildWebhookPayload(type, data);
  const body = JSON.stringify(payload);
  for (const endpointId of endpointIds) {
    enqueueWebhookDelivery({
      endpointId,
      eventId: payload.id,
      type,
      body,
      attempt: 0,
    });
  }
}

export function emitCardScannedWebhook(orgId: string, scanId: string): void {
  enqueueWebhookJob(async () => {
    const endpointIds = await loadSubscribedEndpointIds(orgId, "card.scanned");
    if (endpointIds.length === 0) return;
    const card = await apiKeyQuery(orgId, (tx) =>
      loadPublicApiCard(tx, orgId, scanId),
    );
    if (!card) return;
    dispatch<CardScannedWebhookData>(endpointIds, "card.scanned", { card });
  });
}

export function emitCardsStoredWebhook(
  orgId: string,
  locationGuid: string,
  scanIds: string[],
): void {
  if (scanIds.length === 0) return;
  enqueueWebhookJob(async () => {
    const endpointIds = await loadSubscribedEndpointIds(orgId, "cards.stored");
    if (endpointIds.length === 0) return;
    const cards = (
      await apiKeyQuery(orgId, (tx) =>
        loadPublicApiCardsByScanIds(tx, orgId, scanIds),
      )
    ).filter((card) => card.location?.guid === locationGuid);
    const location = cards[0]?.location;
    if (!location) return;
    for (
      let start = 0;
      start < cards.length;
      start += WEBHOOK_STORED_CARDS_PER_EVENT
    ) {
      dispatch<CardsStoredWebhookData>(endpointIds, "cards.stored", {
        location: { guid: location.guid, name: location.name },
        cards: cards.slice(start, start + WEBHOOK_STORED_CARDS_PER_EVENT),
      });
    }
  });
}
