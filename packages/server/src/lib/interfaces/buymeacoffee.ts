export interface BuyMeACoffeeWebhookEnvelope {
  event_id?: number;
  type?: string;
  live_mode?: boolean;
  created?: number;
  attempt?: number;
  data?: Record<string, unknown>;
}
