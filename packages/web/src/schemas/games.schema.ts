import type { TFunction } from "i18next";
import { z } from "zod";

export function createGameFormSchema(t: TFunction<"games">) {
  const fieldMetaFormSchema = z.object({
    field: z.string().min(1, t("gameFormDialog.validation.required")),
    label: z.string().min(1, t("gameFormDialog.validation.required")),
    type: z.enum(["string", "numeric", "enum", "set"]),
    path: z.string().min(1, t("gameFormDialog.validation.required")),
    optionsText: z.string().optional(),
  });

  return z.object({
    key: z
      .string()
      .min(1, t("gameFormDialog.validation.required"))
      .regex(/^[a-z0-9-]+$/, t("gameFormDialog.validation.keyFormat")),
    name: z.string().min(1, t("gameFormDialog.validation.required")),
    apiDocsUrl: z
      .string()
      .trim()
      .url(t("gameFormDialog.validation.urlFormat"))
      .optional()
      .or(z.literal("")),
    isActive: z.boolean(),
    fieldDefinitions: z
      .array(fieldMetaFormSchema)
      .min(1, t("gameFormDialog.validation.minFields")),
  });
}

export type GameFormValues = z.infer<ReturnType<typeof createGameFormSchema>>;
