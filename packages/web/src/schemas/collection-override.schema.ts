import type { TFunction } from "i18next";
import { z } from "zod";

export function createCollectionOverrideFormSchema(
  t: TFunction<"integrations">,
) {
  return z
    .object({
      collectionGuid: z
        .string()
        .min(1, t("overrideDialog.validation.collectionRequired")),
      scanChannelId: z.string().nullable(),
      errorChannelId: z.string().nullable(),
    })
    .refine((values) => values.scanChannelId || values.errorChannelId, {
      message: t("overrideDialog.validation.channelRequired"),
      path: ["errorChannelId"],
    });
}

export type CollectionOverrideFormValues = z.infer<
  ReturnType<typeof createCollectionOverrideFormSchema>
>;
