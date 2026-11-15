import {
  BUSINESS_PERMISSION_KEYS,
  businessMoneySchema,
  BUYLIST_CREDIT_BONUS_MAX,
  BUYLIST_PERCENT_MAX,
  BUYLIST_TIERS_MAX,
  CARD_CONDITIONS,
  CSV_IMPORT_NAME_MAX_LENGTH,
  DEVICE_MAINTENANCE_INTERVAL_MAX,
  DEVICE_MAINTENANCE_INTERVAL_MIN,
  formValidationMessage,
  ORDER_LINE_QUANTITY_MAX,
  ORDER_LINES_MAX,
  ORDER_NAME_MAX_LENGTH,
  orderDecklistSchema,
  orderSortCatchAllBin,
  ACCURACY_SAMPLE_SIZES,
} from "@magic-vault/shared";
import { PICK_IMPORT_CREATE_MODES } from "@/lib/constants/business";
import { z } from "zod";

export const businessSettingsDraftSchema = z.object({
  buylist: z.object({
    minCardValue: businessMoneySchema,
    tiers: z
      .array(
        z.object({
          minPrice: businessMoneySchema,
          percent: z
            .number({ message: formValidationMessage("percentageRequired") })
            .min(0, formValidationMessage("atLeast", { min: 0 }))
            .max(BUYLIST_PERCENT_MAX, formValidationMessage("atMost", { max: BUYLIST_PERCENT_MAX })),
        }),
      )
      .min(1, formValidationMessage("tiersRequired"))
      .max(BUYLIST_TIERS_MAX, formValidationMessage("tooManyTiers", { max: BUYLIST_TIERS_MAX })),
    bulkThreshold: businessMoneySchema,
    bulkOffer: businessMoneySchema,
    creditBonusPercent: z
      .number({ message: formValidationMessage("percentageRequired") })
      .min(0, formValidationMessage("atLeast", { min: 0 }))
      .max(
        BUYLIST_CREDIT_BONUS_MAX,
        formValidationMessage("atMost", { max: BUYLIST_CREDIT_BONUS_MAX }),
      ),
  }),
  permissions: z.object(
    Object.fromEntries(
      BUSINESS_PERMISSION_KEYS.map((key) => [key, z.boolean()]),
    ) as Record<(typeof BUSINESS_PERMISSION_KEYS)[number], z.ZodBoolean>,
  ),
});

export type BusinessSettingsDraftValues = z.infer<
  typeof businessSettingsDraftSchema
>;

export const intakeOfferSchema = z.object({ offer: businessMoneySchema });

export type IntakeOfferFormValues = z.infer<typeof intakeOfferSchema>;

const orderLineQuantity = z
  .number(formValidationMessage("wholeNumber"))
  .int(formValidationMessage("wholeNumber"))
  .min(1, formValidationMessage("atLeast", { min: 1 }))
  .max(ORDER_LINE_QUANTITY_MAX, formValidationMessage("atMost", { max: ORDER_LINE_QUANTITY_MAX }));

export const orderEditSchema = z.object({
  name: orderDecklistSchema.shape.name,
  lines: z
    .array(
      z.object({
        name: z.string(),
        setCode: z.string().nullable().optional(),
        setName: z.string().nullable().optional(),
        collectorNumber: z.string().nullable().optional(),
        condition: z.enum(CARD_CONDITIONS).nullable().optional(),
        isFoil: z.boolean().nullable().optional(),
        language: z.string().nullable().optional(),
        unitPrice: z.number().nullable().optional(),
        orderRef: z.string().nullable().optional(),
        quantity: orderLineQuantity,
      }),
    )
    .min(1, formValidationMessage("orderLinesRequired"))
    .max(ORDER_LINES_MAX, formValidationMessage("atMost", { max: ORDER_LINES_MAX })),
  cardsToAdd: z.string(),
});

export type OrderEditFormValues = z.infer<typeof orderEditSchema>;

export const pickImportSchema = z.object({
  text: z.string(),
  createMode: z.enum(PICK_IMPORT_CREATE_MODES),
  pickName: z
    .string()
    .max(ORDER_NAME_MAX_LENGTH, formValidationMessage("nameTooLong", { max: ORDER_NAME_MAX_LENGTH })),
  orderNames: z.array(
    z
      .string()
      .max(CSV_IMPORT_NAME_MAX_LENGTH, formValidationMessage("nameTooLong", { max: CSV_IMPORT_NAME_MAX_LENGTH }))
      .optional(),
  ),
});

export type PickImportFormValues = z.infer<typeof pickImportSchema>;

export const orderBinsSchema = (binCount: number) =>
  z.object({
    bins: z
      .array(
        z.object({
          orderRef: z.string(),
          binNumber: z
            .number(formValidationMessage("wholeNumber"))
            .int(formValidationMessage("wholeNumber"))
            .min(1, formValidationMessage("atLeast", { min: 1 }))
            .max(binCount, formValidationMessage("atMost", { max: binCount }))
            .refine(
              (binNumber) => binNumber !== orderSortCatchAllBin(binCount),
              formValidationMessage("orderBinCatchAll"),
            ),
        }),
      )
      .superRefine((bins, context) => {
        bins.forEach((bin, index) => {
          if (bins.findIndex((other) => other.binNumber === bin.binNumber) !== index) {
            context.addIssue({
              code: "custom",
              path: [index, "binNumber"],
              message: formValidationMessage("orderBinDuplicate"),
            });
          }
        });
      }),
  });

export type OrderBinsFormValues = z.infer<ReturnType<typeof orderBinsSchema>>;

export const collectionCostSchema = z.object({
  total: businessMoneySchema,
  mode: z.enum(["spread", "each"]),
  overwrite: z.boolean(),
});

export type CollectionCostFormValues = z.infer<typeof collectionCostSchema>;

export const accuracyCheckSchema = z.object({
  sampleSize: z
    .number()
    .refine((value) =>
      (ACCURACY_SAMPLE_SIZES as readonly number[]).includes(value),
    ),
  unreviewedOnly: z.boolean(),
});

export type AccuracyCheckFormValues = z.infer<typeof accuracyCheckSchema>;

export const serviceIntervalSchema = z.object({
  enabled: z.boolean(),
  interval: z
    .number({ message: formValidationMessage("cardCountRequired") })
    .int(formValidationMessage("wholeNumber"))
    .min(
      DEVICE_MAINTENANCE_INTERVAL_MIN,
      formValidationMessage("atLeast", { min: DEVICE_MAINTENANCE_INTERVAL_MIN }),
    )
    .max(
      DEVICE_MAINTENANCE_INTERVAL_MAX,
      formValidationMessage("atMost", { max: DEVICE_MAINTENANCE_INTERVAL_MAX }),
    ),
});

export type ServiceIntervalFormValues = z.infer<typeof serviceIntervalSchema>;

