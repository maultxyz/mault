import {
  WEBHOOK_EVENTS,
  WEBHOOK_TEST_EVENT,
  type WebhookEndpoint,
  type WebhookEvent,
  type WebhookTestData,
  type WebhookTestResult,
} from "@magic-vault/shared";
import { asc, eq } from "drizzle-orm";
import type { Transaction } from "../../db";
import { webhookEndpoints } from "../../db/schema";
import { getUserDisplayName } from "../../middleware/auth";
import { WEBHOOK_ENDPOINT_COLUMNS } from "../constants/webhooks";
import type { WebhookEndpointRow, WebhookTarget } from "../interfaces/webhooks";
import { recordWebhookDelivery, sendWebhook } from "./delivery";
import { buildWebhookPayload } from "./events";

function toWebhookEvents(events: string[]): WebhookEvent[] {
  return events.filter((event): event is WebhookEvent =>
    (WEBHOOK_EVENTS as readonly string[]).includes(event),
  );
}

export async function toWebhookEndpoint(
  row: WebhookEndpointRow,
): Promise<WebhookEndpoint> {
  return {
    guid: row.guid,
    url: row.url,
    description: row.description,
    events: toWebhookEvents(row.events),
    isEnabled: row.disabledAt === null,
    disabledReason: row.disabledReason,
    createdBy: await getUserDisplayName(row.createdBy),
    createdAt: row.createdAt.toISOString(),
    lastDeliveryAt: row.lastDeliveryAt?.toISOString() ?? null,
    lastStatus: row.lastStatus,
    lastError: row.lastError,
    consecutiveFailures: row.consecutiveFailures,
  };
}

export async function loadWebhookEndpoints(
  tx: Transaction,
  orgId: string,
): Promise<WebhookEndpoint[]> {
  const rows = await tx
    .select(WEBHOOK_ENDPOINT_COLUMNS)
    .from(webhookEndpoints)
    .where(eq(webhookEndpoints.orgId, orgId))
    .orderBy(asc(webhookEndpoints.createdAt));
  return Promise.all(rows.map(toWebhookEndpoint));
}

export async function sendTestWebhook(
  target: WebhookTarget,
): Promise<WebhookTestResult> {
  const payload = buildWebhookPayload<WebhookTestData>(WEBHOOK_TEST_EVENT, {
    message: "This is a test delivery from Mault.",
  });
  const result = await sendWebhook(target.url, target.secret, {
    endpointId: target.id,
    eventId: payload.id,
    type: WEBHOOK_TEST_EVENT,
    body: JSON.stringify(payload),
    attempt: 0,
  });
  await recordWebhookDelivery(target.id, result);
  return result;
}
