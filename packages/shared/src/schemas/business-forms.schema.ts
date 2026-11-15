import { z } from "zod";
import {
  BUYLIST_PRICE_MAX,
  INTAKE_NOTES_MAX_LENGTH,
  INTAKE_TEXT_MAX_LENGTH,
  INTAKE_TRANSFER_NEW_COLLECTION_OPTION,
  ORDER_LINES_MAX,
  ORDER_NAME_MAX_LENGTH,
} from "../constants/business.constant";
import { SET_NAME_MAX_LENGTH } from "../constants/sort-bins.constant";
import { formValidationMessage } from "../form-validation";
import { normalizePickListEntries, parseDecklist } from "../pick-list";

export const businessMoneySchema = z
  .number({ message: formValidationMessage("amountRequired") })
  .min(0, formValidationMessage("atLeast", { min: 0 }))
  .max(BUYLIST_PRICE_MAX, formValidationMessage("atMost", { max: BUYLIST_PRICE_MAX }));

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
