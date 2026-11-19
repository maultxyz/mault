import { z } from "zod";
import { CARD_CONDITIONS } from "../constants/card-condition.constant";
import {
  IN_PERSON_TRADE_CASH_DIRECTIONS,
  IN_PERSON_TRADE_GIVEN_CARDS_MAX,
  IN_PERSON_TRADE_RECEIVED_CARDS_MAX,
  TRADE_OFFER_CARD_QUANTITY_MAX,
  TRADE_OFFER_CASH_AMOUNT_MAX,
  TRADE_OFFER_CASH_INPUT_PATTERN,
  TRADE_OFFER_GUEST_CONTACT_MAX_LENGTH,
  TRADE_OFFER_GUEST_NAME_MAX_LENGTH,
  TRADE_OFFER_GUEST_NOTE_MAX_LENGTH,
  TRADE_OFFER_OFFERED_CARDS_MAX,
  TRADE_OFFER_WANTED_CARDS_MAX,
} from "../constants/trade-offers.constant";
import { formValidationMessage } from "../form-validation";
import { parseTradeOfferCashInput } from "../trade-offer-cash";
import type { CardCondition } from "../interfaces/card-condition.interface";

export const tradeOfferOfferedCardInputSchema = z.object({
  gameKey: z.string().min(1).max(64),
  lang: z.string().min(1).max(16),
  cardId: z.string().min(1).max(200),
  quantity: z.number().int().min(1).max(TRADE_OFFER_CARD_QUANTITY_MAX),
  condition: z.enum(CARD_CONDITIONS as [CardCondition, ...CardCondition[]]),
  isFoil: z.boolean(),
});

const tradeOfferGuestContactSchema = z
  .string()
  .trim()
  .max(TRADE_OFFER_GUEST_CONTACT_MAX_LENGTH, formValidationMessage("textTooLong", { max: TRADE_OFFER_GUEST_CONTACT_MAX_LENGTH }));

export const tradeOfferFormSchema = z.object({
  guestName: z
    .string()
    .trim()
    .min(1, formValidationMessage("nameRequired"))
    .max(TRADE_OFFER_GUEST_NAME_MAX_LENGTH, formValidationMessage("nameTooLong", { max: TRADE_OFFER_GUEST_NAME_MAX_LENGTH })),
  guestContact: tradeOfferGuestContactSchema.min(1, formValidationMessage("contactRequired")),
  guestNote: z
    .string()
    .trim()
    .max(TRADE_OFFER_GUEST_NOTE_MAX_LENGTH, formValidationMessage("textTooLong", { max: TRADE_OFFER_GUEST_NOTE_MAX_LENGTH })),
  offeredCash: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || TRADE_OFFER_CASH_INPUT_PATTERN.test(value),
      formValidationMessage("amountInvalid"),
    )
    .refine(
      (value) => (parseTradeOfferCashInput(value) ?? 0) <= TRADE_OFFER_CASH_AMOUNT_MAX,
      formValidationMessage("atMost", { max: TRADE_OFFER_CASH_AMOUNT_MAX }),
    ),
});

export const tradeOfferFormWithOptionalContactSchema = tradeOfferFormSchema.extend({
  guestContact: tradeOfferGuestContactSchema,
});

export function tradeOfferFormSchemaFor(requiresGuestContact: boolean) {
  return requiresGuestContact ? tradeOfferFormSchema : tradeOfferFormWithOptionalContactSchema;
}

export const tradeOfferRequestSchema = tradeOfferFormWithOptionalContactSchema.omit({ offeredCash: true }).extend({
  wantedScanIds: z.array(z.uuid()).min(1).max(TRADE_OFFER_WANTED_CARDS_MAX),
  offered: z.array(tradeOfferOfferedCardInputSchema).max(TRADE_OFFER_OFFERED_CARDS_MAX),
  offeredCashAmount: z.number().positive().max(TRADE_OFFER_CASH_AMOUNT_MAX).optional(),
});

export const tradeOfferQuoteRequestSchema = z.object({
  wantedScanIds: z.array(z.uuid()).max(TRADE_OFFER_WANTED_CARDS_MAX),
  offered: z.array(tradeOfferOfferedCardInputSchema).max(TRADE_OFFER_OFFERED_CARDS_MAX),
});

const inPersonTradeReceivedCardSchema = tradeOfferOfferedCardInputSchema.pick({
  cardId: true,
  quantity: true,
  condition: true,
  isFoil: true,
});

export const inPersonTradeFormSchema = z.object({
  partnerName: z
    .string()
    .trim()
    .max(TRADE_OFFER_GUEST_NAME_MAX_LENGTH, formValidationMessage("nameTooLong", { max: TRADE_OFFER_GUEST_NAME_MAX_LENGTH })),
  partnerContact: tradeOfferGuestContactSchema,
  note: tradeOfferFormSchema.shape.guestNote,
  cash: tradeOfferFormSchema.shape.offeredCash,
  cashDirection: z.enum(IN_PERSON_TRADE_CASH_DIRECTIONS),
});

export const inPersonTradeQuoteRequestSchema = z.object({
  givenScanIds: z.array(z.uuid()).max(IN_PERSON_TRADE_GIVEN_CARDS_MAX),
  receiveCollectionGuid: z.uuid().optional(),
  received: z.array(inPersonTradeReceivedCardSchema).max(IN_PERSON_TRADE_RECEIVED_CARDS_MAX),
});

export const inPersonTradeRequestSchema = inPersonTradeFormSchema
  .omit({ cash: true })
  .extend({
    ...inPersonTradeQuoteRequestSchema.shape,
    cashAmount: z.number().positive().max(TRADE_OFFER_CASH_AMOUNT_MAX).optional(),
  })
  .refine((request) => request.received.length === 0 || !!request.receiveCollectionGuid, {
    path: ["receiveCollectionGuid"],
  })
  .refine(
    (request) => request.givenScanIds.length + request.received.length > 0 || request.cashAmount != null,
    { path: ["givenScanIds"] },
  );

export const tradeOfferAcceptRequestSchema = z.object({
  removeWantedCardsWhenPicked: z.boolean().optional(),
});

export const tradeOfferPickedRequestSchema = z.object({
  scanIds: z.array(z.uuid()).min(1).max(TRADE_OFFER_WANTED_CARDS_MAX),
});

export type TradeOfferFormValues = z.infer<typeof tradeOfferFormSchema>;
export type TradeOfferRequest = z.infer<typeof tradeOfferRequestSchema>;
export type TradeOfferQuoteRequest = z.infer<typeof tradeOfferQuoteRequestSchema>;
export type InPersonTradeFormValues = z.infer<typeof inPersonTradeFormSchema>;
export type InPersonTradeQuoteRequest = z.infer<typeof inPersonTradeQuoteRequestSchema>;
export type InPersonTradeRequest = z.infer<typeof inPersonTradeRequestSchema>;
export type InPersonTradeReceivedCardInput = z.infer<typeof inPersonTradeReceivedCardSchema>;
