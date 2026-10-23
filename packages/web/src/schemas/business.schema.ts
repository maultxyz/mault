import {
  BUSINESS_PERMISSION_KEYS,
  BUYLIST_CREDIT_BONUS_MAX,
  BUYLIST_PERCENT_MAX,
  BUYLIST_PRICE_MAX,
  BUYLIST_TIERS_MAX,
  DEVICE_MAINTENANCE_INTERVAL_MAX,
  DEVICE_MAINTENANCE_INTERVAL_MIN,
  INTAKE_NOTES_MAX_LENGTH,
  INTAKE_TEXT_MAX_LENGTH,
  ORDER_NAME_MAX_LENGTH,
  ACCURACY_SAMPLE_SIZES,
  SET_NAME_MAX_LENGTH,
} from "@magic-vault/shared";
import { NEW_COLLECTION_OPTION } from "@/lib/constants/business";
import { z } from "zod";

const money = z
  .number({ message: "Enter an amount" })
  .min(0, "Must be 0 or more")
  .max(BUYLIST_PRICE_MAX, `Must be ${BUYLIST_PRICE_MAX} or less`);

export const businessSettingsDraftSchema = z.object({
  buylist: z.object({
    minCardValue: money,
    tiers: z
      .array(
        z.object({
          minPrice: money,
          percent: z
            .number({ message: "Enter a percentage" })
            .min(0, "Must be 0 or more")
            .max(BUYLIST_PERCENT_MAX, `Must be ${BUYLIST_PERCENT_MAX} or less`),
        }),
      )
      .min(1, "Add at least one tier")
      .max(BUYLIST_TIERS_MAX, `At most ${BUYLIST_TIERS_MAX} tiers`),
    bulkThreshold: money,
    bulkOffer: money,
    creditBonusPercent: z
      .number({ message: "Enter a percentage" })
      .min(0, "Must be 0 or more")
      .max(
        BUYLIST_CREDIT_BONUS_MAX,
        `Must be ${BUYLIST_CREDIT_BONUS_MAX} or less`,
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
      .min(1, "Customer name is required")
      .max(INTAKE_TEXT_MAX_LENGTH, `${INTAKE_TEXT_MAX_LENGTH} characters or less`),
    customerContact: z
      .string()
      .trim()
      .max(INTAKE_TEXT_MAX_LENGTH, `${INTAKE_TEXT_MAX_LENGTH} characters or less`),
    notes: z
      .string()
      .trim()
      .max(
        INTAKE_NOTES_MAX_LENGTH,
        `${INTAKE_NOTES_MAX_LENGTH} characters or less`,
      ),
  })
  .superRefine((values, ctx) => {
    if (values.collectionMode === "existing" && !values.collectionGuid) {
      ctx.addIssue({
        code: "custom",
        message: "Choose a collection",
        path: ["collectionGuid"],
      });
    }
    if (values.collectionMode === "new" && !values.gameGuid) {
      ctx.addIssue({ code: "custom", message: "Choose a game", path: ["gameGuid"] });
    }
    if (values.collectionMode === "new" && !values.lang) {
      ctx.addIssue({ code: "custom", message: "Choose a language", path: ["lang"] });
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
    .min(1, "Name is required")
    .max(ORDER_NAME_MAX_LENGTH, `${ORDER_NAME_MAX_LENGTH} characters or less`),
  text: z.string().trim().min(1, "Paste an order or choose a file"),
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
    .number({ message: "Enter a number of cards" })
    .int("Whole cards only")
    .min(
      DEVICE_MAINTENANCE_INTERVAL_MIN,
      `At least ${DEVICE_MAINTENANCE_INTERVAL_MIN}`,
    )
    .max(
      DEVICE_MAINTENANCE_INTERVAL_MAX,
      `At most ${DEVICE_MAINTENANCE_INTERVAL_MAX}`,
    ),
});

export type ServiceIntervalFormValues = z.infer<typeof serviceIntervalSchema>;

export const orderPicksSchema = z.object({ picked: z.array(z.string()) });

export type OrderPicksFormValues = z.infer<typeof orderPicksSchema>;

export const intakeTransferSchema = z
  .object({
    targetCollectionGuid: z.string().min(1, "Choose a collection"),
    newCollectionName: z
      .string()
      .trim()
      .max(SET_NAME_MAX_LENGTH, `${SET_NAME_MAX_LENGTH} characters or less`),
    deleteSource: z.boolean(),
  })
  .superRefine((values, ctx) => {
    if (
      values.targetCollectionGuid === NEW_COLLECTION_OPTION &&
      !values.newCollectionName
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Name is required",
        path: ["newCollectionName"],
      });
    }
  });

export type IntakeTransferFormValues = z.infer<typeof intakeTransferSchema>;
