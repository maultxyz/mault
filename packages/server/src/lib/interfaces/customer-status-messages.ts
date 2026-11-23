import type {
  CardCondition,
  CardReservationCard,
  CardReservationGuestAlert,
  CardReservationStatus,
  TradeOfferCash,
  TradeOfferOfferedCard,
  TradeOfferStatus,
  TradeOfferWantedCard,
} from "@magic-vault/shared";

export interface ReservationStatusMessageCard {
  card: CardReservationCard;
  guestAlert: CardReservationGuestAlert | null;
  holdExpiresAt: Date | null;
  queuePosition: number | null;
}

export interface ReservationStatusMessage {
  discordUserId: string;
  orgId: string;
  customerUserId: string;
  shopName: string | null;
  customerName: string | null;
  event: "created" | "changed";
  catalogName: string | null;
  requestGuid: string;
  cards: ReservationStatusMessageCard[];
}

export interface TradeOfferStatusMessage {
  discordUserId: string;
  orgId: string;
  customerUserId: string;
  shopName: string | null;
  customerName: string | null;
  event: "created" | "accepted" | "declined";
  offerGuid: string;
  sentToName: string | null;
  wanted: TradeOfferWantedCard[];
  offered: TradeOfferOfferedCard[];
  offeredCash: TradeOfferCash | null;
  happenedAt: Date;
}

export interface CardLineInput {
  name: string;
  setCode: string;
  collectorNumber: string;
  condition: CardCondition;
  isFoil: boolean;
  foilType?: string | null;
}

export interface ReservationMessageRow {
  discord_user_id: string;
  org_id: string;
  guest_user_id: string;
  request_guid: string;
  catalog_name: string | null;
  collection_card_id: number;
  reservation_id: number;
  card: CardReservationCard;
  guest_alert: CardReservationGuestAlert | null;
  status: CardReservationStatus;
  hold_expires_at_epoch: number | null;
}

export interface TradeOfferMessageRow {
  discord_user_id: string;
  org_id: string;
  guest_user_id: string;
  guid: string;
  status: TradeOfferStatus;
  sent_to_name: string | null;
  wanted_cards: TradeOfferWantedCard[];
  offered_cards: TradeOfferOfferedCard[];
  offered_cash_amount: number | null;
  offered_cash_currency: string | null;
  happened_at_epoch: number;
}
