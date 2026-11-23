import type { STATUS_MESSAGE_KINDS } from "../constants/status-messages.constant";

export type StatusMessageKind = (typeof STATUS_MESSAGE_KINDS)[number];

export interface StatusMessageSettings {
  isAvailable: boolean;
  isDiscordLinked: boolean;
  tradeOffers: boolean;
  cardReservations: boolean;
}

export type StatusMessageSettingsUpdate = Partial<Record<StatusMessageKind, boolean>>;
