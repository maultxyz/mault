import { z } from "zod";
import { SET_NAME_MAX_LENGTH } from "@magic-vault/shared";

const nameSchema = z.string().trim().min(1).max(SET_NAME_MAX_LENGTH);

export const createCollectionSchema = z.object({
  name: nameSchema,
  gameGuid: z.string().min(1),
  lang: z.string().min(1),
  matchAllLanguages: z.boolean(),
});

export const renameCollectionSchema = z.object({
  name: nameSchema,
});
