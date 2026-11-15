import { formValidationMessage } from "@magic-vault/shared";
import { z } from "zod";
import {
  STORAGE_LABEL_TEMPLATE_IDS,
  STORAGE_LABEL_TEMPLATES,
} from "@/lib/constants/storage-labels";

export const storageLabelOptionsSchema = z
  .object({
    locationGuids: z.array(z.string()),
    templateId: z.enum(STORAGE_LABEL_TEMPLATE_IDS),
    startPosition: z
      .number(formValidationMessage("valueRequired"))
      .int(formValidationMessage("wholeNumber"))
      .min(1, formValidationMessage("atLeast", { min: 1 })),
  })
  .superRefine((values, context) => {
    const template = STORAGE_LABEL_TEMPLATES[values.templateId];
    const labelsPerSheet = template.columns * template.rows;
    if (values.startPosition > labelsPerSheet) {
      context.addIssue({
        code: "custom",
        path: ["startPosition"],
        message: formValidationMessage("atMost", { max: labelsPerSheet }),
      });
    }
  });

export type StorageLabelOptionsFormValues = z.infer<typeof storageLabelOptionsSchema>;
