import {
  MY_CARD_RESERVATION_REQUEST_PARAM,
  MY_CARD_RESERVATIONS_WEB_PATH,
} from "./constants/status-messages.constant";

export function sentTradeOfferWebPath(offerGuid: string): string {
  return `/app/trades/sent/${encodeURIComponent(offerGuid)}`;
}

export function myCardReservationRequestWebPath(requestGuid: string): string {
  return `${MY_CARD_RESERVATIONS_WEB_PATH}&${MY_CARD_RESERVATION_REQUEST_PARAM}=${encodeURIComponent(requestGuid)}`;
}
