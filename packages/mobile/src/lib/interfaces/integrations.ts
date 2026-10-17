import type { NOTIFICATION_TEST_TYPES } from "@/lib/constants/integrations";

export type NotificationTestType = (typeof NOTIFICATION_TEST_TYPES)[number];

export type NotificationTestOutcome = "sent" | "no_channel" | "failed";

export interface DiscordLinkCode {
  code: string;
  expiresAt: string;
}

export interface DiscordChannelsDraft {
  scanChannelId: string | null;
  errorChannelId: string | null;
}

export type DiscordChannelPicker =
  | { kind: "scan" | "error"; collectionGuid: string | null }
  | { kind: "add-collection" }
  | { kind: "add-channel"; collectionGuid: string };
