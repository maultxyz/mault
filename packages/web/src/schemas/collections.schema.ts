import { SET_NAME_MAX_LENGTH } from "@magic-vault/shared";
import { z } from "zod";

const nameSchema = z
  .string()
  .trim()
  .min(1, "Name is required")
  .max(SET_NAME_MAX_LENGTH, `Name must be ${SET_NAME_MAX_LENGTH} characters or less`);

const matchThresholdSchema = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .transform((val) => (val === "" || val == null ? null : Number(val)))
  .pipe(
    z.union([
      z.number().int().min(1, "Must be at least 1%").max(99, "Must be at most 99%"),
      z.null(),
    ]),
  );

export const createCollectionSchema = z.object({
  name: nameSchema,
  gameGuid: z.string().min(1, "Game is required"),
  lang: z.string().min(1, "Language is required"),
  matchThreshold: matchThresholdSchema,
});

export type CreateCollectionFormValues = z.infer<typeof createCollectionSchema>;

export const editCollectionSchema = z.object({
  name: nameSchema,
  matchThreshold: matchThresholdSchema,
});

export type EditCollectionFormValues = z.infer<typeof editCollectionSchema>;
