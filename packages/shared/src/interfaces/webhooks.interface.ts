import type { ApiLocationRef, ApiScannedCard } from "./api-keys.interface";
import type {
  WEBHOOK_EVENTS,
  WEBHOOK_TEST_EVENT,
} from "../constants/webhooks.constant";

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

export type WebhookEventType = WebhookEvent | typeof WEBHOOK_TEST_EVENT;

export interface WebhookEndpoint {
  guid: string;
  url: string;
  description: string | null;
  events: WebhookEvent[];
  isEnabled: boolean;
  disabledReason: string | null;
  createdBy: string;
  createdAt: string;
  lastDeliveryAt: string | null;
  lastStatus: number | null;
  lastError: string | null;
  consecutiveFailures: number;
}

export interface WebhookEndpointList {
  endpoints: WebhookEndpoint[];
  canManage: boolean;
}

export interface WebhookEndpointInput {
  url: string;
  description: string | null;
  events: WebhookEvent[];
}

export interface CreatedWebhookEndpoint {
  endpoint: WebhookEndpoint;
  secret: string;
}

export interface WebhookTestResult {
  ok: boolean;
  status: number | null;
  error: string | null;
}

export interface WebhookPayload<T> {
  object: "event";
  id: string;
  type: WebhookEventType;
  created_at: string;
  data: T;
}

export type CardScannedWebhookData = ApiScannedCard;

export interface CardsStoredWebhookData {
  object: "stored_cards";
  location: ApiLocationRef;
  cards: ApiScannedCard[];
}

export interface WebhookTestData {
  object: "test";
  message: string;
}
