import { z } from "zod";
import {
  BUSINESS_PERMISSION_KEYS,
  BUYLIST_CREDIT_BONUS_MAX,
  BUYLIST_PERCENT_MAX,
  BUYLIST_PRICE_MAX,
  BUYLIST_TIERS_MAX,
  INTAKE_NOTES_MAX_LENGTH,
  INTAKE_TEXT_MAX_LENGTH,
  INTAKE_TRANSFER_NEW_COLLECTION_OPTION,
  ORDER_LINES_MAX,
  ORDER_NAME_MAX_LENGTH,
  CARD_COST_MODES,
  SELL_PRICE_MODES,
  PRICE_MARKUP_PERCENT_MAX,
  PRICE_MARKUP_PERCENT_MIN,
} from "../constants/business.constant";
import { BULK_SCAN_IDS_MAX } from "../constants/collection-cards.constant";
import { SET_NAME_MAX_LENGTH } from "../constants/sort-bins.constant";
import { PRICE_LABEL_ROUNDING_MODES } from "../constants/price-labels.constant";
import { formValidationMessage } from "../form-validation";
import { normalizePickListEntries, parseDecklist } from "../pick-list";

export const businessMoneySchema = z
  .number({ message: formValidationMessage("amountRequired") })
  .min(0, formValidationMessage("atLeast", { min: 0 }))
  .max(BUYLIST_PRICE_MAX, formValidationMessage("atMost", { max: BUYLIST_PRICE_MAX }));

const buylistPercentSchema = (max: number) =>
  z
    .number({ message: formValidationMessage("percentageRequired") })
    .min(0, formValidationMessage("atLeast", { min: 0 }))
    .max(max, formValidationMessage("atMost", { max }));

export const sellPriceConfigSchema = z.object({
  defaultMarkupPercent: z
    .number({ message: formValidationMessage("percentageRequired") })
    .min(PRICE_MARKUP_PERCENT_MIN, formValidationMessage("atLeast", { min: PRICE_MARKUP_PERCENT_MIN }))
    .max(PRICE_MARKUP_PERCENT_MAX, formValidationMessage("atMost", { max: PRICE_MARKUP_PERCENT_MAX })),
  rounding: z.enum(PRICE_LABEL_ROUNDING_MODES),
});

export const businessSettingsDraftSchema = z.object({
  sell: sellPriceConfigSchema,
  buylist: z.object({
    minCardValue: businessMoneySchema,
    tiers: z
      .array(z.object({ minPrice: businessMoneySchema, percent: buylistPercentSchema(BUYLIST_PERCENT_MAX) }))
      .min(1, formValidationMessage("tiersRequired"))
      .max(BUYLIST_TIERS_MAX, formValidationMessage("tooManyTiers", { max: BUYLIST_TIERS_MAX })),
    bulkThreshold: businessMoneySchema,
    bulkOffer: businessMoneySchema,
    creditBonusPercent: buylistPercentSchema(BUYLIST_CREDIT_BONUS_MAX),
  }),
  permissions: z.object(
    Object.fromEntries(BUSINESS_PERMISSION_KEYS.map((key) => [key, z.boolean()])) as Record<
      (typeof BUSINESS_PERMISSION_KEYS)[number],
      z.ZodBoolean
    >,
  ),
});

export type BusinessSettingsDraftValues = z.infer<typeof businessSettingsDraftSchema>;

export const intakeLotSchema = z
  .object({
    collectionMode: z.enum(["new", "existing"]),
    collectionGuid: z.string(),
    gameGuid: z.string(),
    lang: z.string(),
    customerName: z
      .string()
      .trim()
      .min(1, formValidationMessage("customerNameRequired"))
      .max(INTAKE_TEXT_MAX_LENGTH, formValidationMessage("nameTooLong", { max: INTAKE_TEXT_MAX_LENGTH })),
    customerContact: z
      .string()
      .trim()
      .max(INTAKE_TEXT_MAX_LENGTH, formValidationMessage("nameTooLong", { max: INTAKE_TEXT_MAX_LENGTH })),
    notes: z
      .string()
      .trim()
      .max(INTAKE_NOTES_MAX_LENGTH, formValidationMessage("nameTooLong", { max: INTAKE_NOTES_MAX_LENGTH })),
  })
  .superRefine((values, ctx) => {
    if (values.collectionMode === "existing" && !values.collectionGuid) {
      ctx.addIssue({ code: "custom", message: formValidationMessage("collectionRequired"), path: ["collectionGuid"] });
    }
    if (values.collectionMode === "new" && !values.gameGuid) {
      ctx.addIssue({ code: "custom", message: formValidationMessage("gameRequired"), path: ["gameGuid"] });
    }
    if (values.collectionMode === "new" && !values.lang) {
      ctx.addIssue({ code: "custom", message: formValidationMessage("languageRequired"), path: ["lang"] });
    }
  });

export type IntakeLotFormValues = z.infer<typeof intakeLotSchema>;

export const intakeAcceptSchema = z.object({
  payoutMethod: z.enum(["cash", "credit"]),
  useOverride: z.boolean(),
  totalOverride: businessMoneySchema.nullable(),
});

export type IntakeAcceptFormValues = z.infer<typeof intakeAcceptSchema>;

export const intakeCancelSchema = z.object({ removeCards: z.boolean() });

export type IntakeCancelFormValues = z.infer<typeof intakeCancelSchema>;

export const intakeTransferSchema = z
  .object({
    targetCollectionGuid: z.string().min(1, formValidationMessage("collectionRequired")),
    newCollectionName: z
      .string()
      .trim()
      .max(SET_NAME_MAX_LENGTH, formValidationMessage("nameTooLong", { max: SET_NAME_MAX_LENGTH })),
    deleteSource: z.boolean(),
  })
  .superRefine((values, ctx) => {
    if (values.targetCollectionGuid === INTAKE_TRANSFER_NEW_COLLECTION_OPTION && !values.newCollectionName) {
      ctx.addIssue({ code: "custom", message: formValidationMessage("nameRequired"), path: ["newCollectionName"] });
    }
  });

export type IntakeTransferFormValues = z.infer<typeof intakeTransferSchema>;

export const orderDecklistSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, formValidationMessage("nameRequired"))
    .max(ORDER_NAME_MAX_LENGTH, formValidationMessage("nameTooLong", { max: ORDER_NAME_MAX_LENGTH })),
  decklist: z
    .string()
    .refine((text) => normalizePickListEntries(parseDecklist(text)).length > 0, formValidationMessage("decklistRequired"))
    .refine(
      (text) => normalizePickListEntries(parseDecklist(text)).length <= ORDER_LINES_MAX,
      formValidationMessage("atMost", { max: ORDER_LINES_MAX }),
    ),
});

export type OrderDecklistFormValues = z.infer<typeof orderDecklistSchema>;

export const priceMarkupPercentSchema = z
  .number({ message: formValidationMessage("percentageRequired") })
  .min(PRICE_MARKUP_PERCENT_MIN, formValidationMessage("atLeast", { min: PRICE_MARKUP_PERCENT_MIN }))
  .max(PRICE_MARKUP_PERCENT_MAX, formValidationMessage("atMost", { max: PRICE_MARKUP_PERCENT_MAX }));

export const sellPriceFormSchema = z
  .object({
    mode: z.enum(SELL_PRICE_MODES),
    markupPercent: priceMarkupPercentSchema,
    fixedPrice: businessMoneySchema,
  });

export type SellPriceFormValues = z.infer<typeof sellPriceFormSchema>;

export const cardCostFormSchema = z.object({
  mode: z.enum(CARD_COST_MODES),
  amount: businessMoneySchema,
});

export type CardCostFormValues = z.infer<typeof cardCostFormSchema>;

const scanIdsSchema = z.array(z.string().uuid()).min(1).max(BULK_SCAN_IDS_MAX);

export const cardSellPriceRequestSchema = z.discriminatedUnion("mode", [
  z.object({ scanIds: scanIdsSchema, mode: z.literal("default") }),
  z.object({ scanIds: scanIdsSchema, mode: z.literal("markup"), markupPercent: priceMarkupPercentSchema }),
  z.object({ scanIds: scanIdsSchema, mode: z.literal("fixed"), fixedPrice: businessMoneySchema }),
]);

export type CardSellPriceRequest = z.infer<typeof cardSellPriceRequestSchema>;

export const cardCostRequestSchema = z.object({
  scanIds: scanIdsSchema,
  mode: z.enum(CARD_COST_MODES),
  amount: businessMoneySchema,
});

export type CardCostRequest = z.infer<typeof cardCostRequestSchema>;
