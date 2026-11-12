import { z } from "zod";
import { CARD_CONDITIONS } from "../constants/card-condition.constant";
import {
  TRADE_OFFER_CARD_QUANTITY_MAX,
  TRADE_OFFER_GUEST_CONTACT_MAX_LENGTH,
  TRADE_OFFER_GUEST_NAME_MAX_LENGTH,
  TRADE_OFFER_GUEST_NOTE_MAX_LENGTH,
  TRADE_OFFER_OFFERED_CARDS_MAX,
  TRADE_OFFER_WANTED_CARDS_MAX,
} from "../constants/trade-offers.constant";
import { formValidationMessage } from "../form-validation";
import type { CardCondition } from "../interfaces/card-condition.interface";

export const tradeOfferOfferedCardInputSchema = z.object({
  gameKey: z.string().min(1).max(64),
  lang: z.string().min(1).max(16),
  cardId: z.string().min(1).max(200),
  quantity: z.number().int().min(1).max(TRADE_OFFER_CARD_QUANTITY_MAX),
  condition: z.enum(CARD_CONDITIONS as [CardCondition, ...CardCondition[]]),
  isFoil: z.boolean(),
});

export const tradeOfferFormSchema = z.object({
  guestName: z
    .string()
    .trim()
    .min(1, formValidationMessage("nameRequired"))
    .max(TRADE_OFFER_GUEST_NAME_MAX_LENGTH, formValidationMessage("nameTooLong", { max: TRADE_OFFER_GUEST_NAME_MAX_LENGTH })),
  guestContact: z
    .string()
    .trim()
    .min(1, formValidationMessage("contactRequired"))
    .max(TRADE_OFFER_GUEST_CONTACT_MAX_LENGTH, formValidationMessage("textTooLong", { max: TRADE_OFFER_GUEST_CONTACT_MAX_LENGTH })),
  guestNote: z
    .string()
    .trim()
    .max(TRADE_OFFER_GUEST_NOTE_MAX_LENGTH, formValidationMessage("textTooLong", { max: TRADE_OFFER_GUEST_NOTE_MAX_LENGTH })),
});

export const tradeOfferRequestSchema = tradeOfferFormSchema.extend({
  wantedScanIds: z.array(z.uuid()).min(1).max(TRADE_OFFER_WANTED_CARDS_MAX),
  offered: z.array(tradeOfferOfferedCardInputSchema).min(1).max(TRADE_OFFER_OFFERED_CARDS_MAX),
});

export type TradeOfferFormValues = z.infer<typeof tradeOfferFormSchema>;
export type TradeOfferRequest = z.infer<typeof tradeOfferRequestSchema>;
export type TradeOfferOfferedCardInput = z.infer<typeof tradeOfferOfferedCardInputSchema>;
