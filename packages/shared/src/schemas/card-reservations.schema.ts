import { z } from "zod";
import {
  CARD_RESERVATION_CARDS_PER_REQUEST_MAX,
  CARD_RESERVATION_PICK_NAME_MAX_LENGTH,
} from "../constants/card-reservations.constant";
import { tradeOfferFormSchema } from "./trade-offers.schema";

export const cardReservationFormSchema = tradeOfferFormSchema.pick({
  guestName: true,
  guestContact: true,
  guestNote: true,
});

export const cardReservationRequestSchema = cardReservationFormSchema.extend({
  scanIds: z.array(z.uuid()).min(1).max(CARD_RESERVATION_CARDS_PER_REQUEST_MAX),
});

export type CardReservationFormValues = z.infer<typeof cardReservationFormSchema>;
export type CardReservationRequest = z.infer<typeof cardReservationRequestSchema>;

export const cardReservationPickRequestSchema = z.object({
  name: z.string().trim().min(1).max(CARD_RESERVATION_PICK_NAME_MAX_LENGTH),
});

export type CardReservationPickRequest = z.infer<typeof cardReservationPickRequestSchema>;
