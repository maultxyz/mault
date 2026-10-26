import {
  BUSINESS_PERMISSION_KEYS,
  BUYLIST_CREDIT_BONUS_MAX,
  BUYLIST_PERCENT_MAX,
  BUYLIST_PRICE_MAX,
  BUYLIST_TIERS_MAX,
  DEVICE_MAINTENANCE_INTERVAL_MAX,
  DEVICE_MAINTENANCE_INTERVAL_MIN,
  formValidationMessage,
  INTAKE_NOTES_MAX_LENGTH,
  INTAKE_TEXT_MAX_LENGTH,
  ORDER_NAME_MAX_LENGTH,
  ACCURACY_SAMPLE_SIZES,
  SET_NAME_MAX_LENGTH,
} from "@magic-vault/shared";
import { NEW_COLLECTION_OPTION } from "@/lib/constants/business";
import { z } from "zod";

const money = z
  .number({ message: formValidationMessage("amountRequired") })
  .min(0, formValidationMessage("atLeast", { min: 0 }))
  .max(BUYLIST_PRICE_MAX, formValidationMessage("atMost", { max: BUYLIST_PRICE_MAX }));

export const businessSettingsDraftSchema = z.object({
  buylist: z.object({
    minCardValue: money,
    tiers: z
      .array(
        z.object({
          minPrice: money,
          percent: z
            .number({ message: formValidationMessage("percentageRequired") })
            .min(0, formValidationMessage("atLeast", { min: 0 }))
            .max(BUYLIST_PERCENT_MAX, formValidationMessage("atMost", { max: BUYLIST_PERCENT_MAX })),
        }),
      )
      .min(1, formValidationMessage("tiersRequired"))
      .max(BUYLIST_TIERS_MAX, formValidationMessage("tooManyTiers", { max: BUYLIST_TIERS_MAX })),
    bulkThreshold: money,
    bulkOffer: money,
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
      .max(
        INTAKE_NOTES_MAX_LENGTH,
        formValidationMessage("nameTooLong", { max: INTAKE_NOTES_MAX_LENGTH }),
      ),
  })
  .superRefine((values, ctx) => {
    if (values.collectionMode === "existing" && !values.collectionGuid) {
      ctx.addIssue({
        code: "custom",
        message: formValidationMessage("collectionRequired"),
        path: ["collectionGuid"],
      });
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
  totalOverride: money.nullable(),
});

export type IntakeAcceptFormValues = z.infer<typeof intakeAcceptSchema>;

export const intakeCancelSchema = z.object({ removeCards: z.boolean() });

export type IntakeCancelFormValues = z.infer<typeof intakeCancelSchema>;

export const orderImportSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, formValidationMessage("nameRequired"))
    .max(ORDER_NAME_MAX_LENGTH, formValidationMessage("nameTooLong", { max: ORDER_NAME_MAX_LENGTH })),
  text: z.string().trim().min(1, formValidationMessage("orderTextRequired")),
});

export type OrderImportFormValues = z.infer<typeof orderImportSchema>;

export const collectionCostSchema = z.object({
  total: money,
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

export const orderPicksSchema = z.object({ picked: z.array(z.string()) });

export type OrderPicksFormValues = z.infer<typeof orderPicksSchema>;

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
    if (
      values.targetCollectionGuid === NEW_COLLECTION_OPTION &&
      !values.newCollectionName
    ) {
      ctx.addIssue({
        code: "custom",
        message: formValidationMessage("nameRequired"),
        path: ["newCollectionName"],
      });
    }
  });

export type IntakeTransferFormValues = z.infer<typeof intakeTransferSchema>;
