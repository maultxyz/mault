import type { WebhookEventType } from "@magic-vault/shared";

export type WebhookJob = () => Promise<void>;

export interface WebhookDeliveryJob {
  endpointId: number;
  eventId: string;
  type: WebhookEventType;
  body: string;
  attempt: number;
}

export interface WebhookDeliveryResult {
  ok: boolean;
  status: number | null;
  error: string | null;
}

export interface WebhookEndpointRow {
  id: number;
  guid: string;
  url: string;
  description: string | null;
  events: string[];
  createdBy: string;
  createdAt: Date;
  disabledAt: Date | null;
  disabledReason: string | null;
  lastDeliveryAt: Date | null;
  lastStatus: number | null;
  lastError: string | null;
  consecutiveFailures: number;
}

export interface WebhookTarget {
  id: number;
  url: string;
  secret: string;
}
