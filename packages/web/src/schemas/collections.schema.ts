import { SET_NAME_MAX_LENGTH } from "@magic-vault/shared";
import { z } from "zod";

const nameSchema = z
  .string()
  .trim()
  .min(1, "Name is required")
  .max(SET_NAME_MAX_LENGTH, `Name must be ${SET_NAME_MAX_LENGTH} characters or less`);

export const createCollectionSchema = z.object({
  name: nameSchema,
  gameGuid: z.string().min(1, "Game is required"),
  lang: z.string().min(1, "Language is required"),
});

export type CreateCollectionFormValues = z.infer<typeof createCollectionSchema>;

export const editCollectionSchema = z.object({
  name: nameSchema,
});

export type EditCollectionFormValues = z.infer<typeof editCollectionSchema>;
