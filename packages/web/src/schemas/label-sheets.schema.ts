import { formValidationMessage } from "@magic-vault/shared";
import { z } from "zod";
import {
  LABEL_SHEET_TEMPLATE_IDS,
  LABEL_SHEET_TEMPLATES,
} from "@/lib/constants/label-sheets";
import type { LabelSheetOptionValues } from "@/lib/interfaces/label-sheets";
import { labelsPerSheet } from "@/lib/label-sheet";

export const labelSheetOptionsShape = {
  templateId: z.enum(LABEL_SHEET_TEMPLATE_IDS),
  startPosition: z
    .number(formValidationMessage("valueRequired"))
    .int(formValidationMessage("wholeNumber"))
    .min(1, formValidationMessage("atLeast", { min: 1 })),
};

export function refineLabelSheetStartPosition(
  values: LabelSheetOptionValues,
  context: z.RefinementCtx,
) {
  const sheetCapacity = labelsPerSheet(LABEL_SHEET_TEMPLATES[values.templateId]);
  if (values.startPosition > sheetCapacity) {
    context.addIssue({
      code: "custom",
      path: ["startPosition"],
      message: formValidationMessage("atMost", { max: sheetCapacity }),
    });
  }
}
