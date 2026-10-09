import type { OrgRole } from "@magic-vault/shared";
import { webhookEndpoints } from "../../db/schema";

export const WEBHOOK_MANAGER_ROLES: OrgRole[] = ["owner", "admin"];
export const WEBHOOK_SECRET_RANDOM_BYTES = 32;
export const WEBHOOK_DELIVERY_TIMEOUT_MS = 10_000;
export const WEBHOOK_RETRY_DELAYS_MS = [10_000, 60_000, 300_000, 1_800_000];
export const WEBHOOK_MAX_CONSECUTIVE_FAILURES = 20;
export const WEBHOOK_DELIVERY_CONCURRENCY = 4;
export const WEBHOOK_QUEUE_LIMIT = 1000;
export const WEBHOOK_STORED_CARDS_PER_EVENT = 200;
export const WEBHOOK_LAST_ERROR_MAX_LENGTH = 300;
export const WEBHOOK_USER_AGENT = "Mault-Webhooks/1";
export const WEBHOOK_AUTO_DISABLED_REASON = `Disabled after ${WEBHOOK_MAX_CONSECUTIVE_FAILURES} failed deliveries in a row.`;
export const WEBHOOK_UPGRADE_MESSAGE =
  "Webhooks are part of the Business plan. Upgrade to Business to add them.";

export const WEBHOOK_BLOCKED_IPV4_SUBNETS: [string, number][] = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
];

export const WEBHOOK_BLOCKED_IPV6_SUBNETS: [string, number][] = [
  ["::", 128],
  ["::1", 128],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
];

export const WEBHOOK_ENDPOINT_COLUMNS = {
  id: webhookEndpoints.id,
  guid: webhookEndpoints.guid,
  url: webhookEndpoints.url,
  description: webhookEndpoints.description,
  events: webhookEndpoints.events,
  createdBy: webhookEndpoints.createdBy,
  createdAt: webhookEndpoints.createdAt,
  disabledAt: webhookEndpoints.disabledAt,
  disabledReason: webhookEndpoints.disabledReason,
  lastDeliveryAt: webhookEndpoints.lastDeliveryAt,
  lastStatus: webhookEndpoints.lastStatus,
  lastError: webhookEndpoints.lastError,
  consecutiveFailures: webhookEndpoints.consecutiveFailures,
};
