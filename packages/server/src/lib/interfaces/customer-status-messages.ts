import type {
  CardReservationCard,
  CardReservationGuestAlert,
  TradeOfferStatus,
} from "@magic-vault/shared";

export interface ClaimedReservationStatusMessage {
  discordUserId: string;
  catalogName: string | null;
  card: CardReservationCard;
  guestAlert: CardReservationGuestAlert;
  holdExpiresAt: Date | null;
}

export interface ClaimedTradeOfferStatusMessage {
  discordUserId: string;
  status: TradeOfferStatus;
  sentToName: string | null;
  wantedCount: number;
  respondedAt: Date;
}
